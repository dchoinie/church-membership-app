import { NextResponse } from "next/server";
import { eq, desc, count, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, givingItems, givingCategories } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions (always filter by churchId via member relationship)
    const whereConditions = [eq(members.churchId, churchId)];
    if (memberId) {
      whereConditions.push(eq(giving.memberId, memberId));
    }
    const whereCondition = and(...whereConditions);

    // Get total count (filtered by churchId)
    const [totalResult] = await db
      .select({ count: count() })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(whereCondition);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated giving records with member info (filtered by churchId)
    const givingRecordsRaw = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
        createdAt: giving.createdAt,
        updatedAt: giving.updatedAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          householdId: members.householdId,
          envelopeNumber: members.envelopeNumber,
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(whereCondition)
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt))
      .limit(validPageSize)
      .offset(offset);

    // For each giving record, find the head of household and fetch items
    const givingRecords = await Promise.all(
      givingRecordsRaw.map(async (record) => {
        // Get giving items for this record
        const items = await db
          .select({
            categoryId: givingItems.categoryId,
            categoryName: givingCategories.name,
            amount: givingItems.amount,
          })
          .from(givingItems)
          .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
          .where(eq(givingItems.givingId, record.id));

        // If the member has an envelope number, find head of household with sequence = "head_of_house"
        let finalMember = {
          id: record.member.id,
          firstName: record.member.firstName,
          lastName: record.member.lastName,
        };

        if (record.member.envelopeNumber) {
          // First get the household ID from the record's member
          const [recordMember] = await db
            .select({ householdId: members.householdId })
            .from(members)
            .where(eq(members.id, record.member.id))
            .limit(1);

          if (recordMember?.householdId) {
            const [headOfHousehold] = await db
              .select({
                id: members.id,
                firstName: members.firstName,
                lastName: members.lastName,
              })
              .from(members)
              .where(
                and(
                  eq(members.householdId, recordMember.householdId),
                  eq(members.sequence, "head_of_house")
                )
              )
              .limit(1);

            if (headOfHousehold) {
              finalMember = {
                id: headOfHousehold.id,
                firstName: headOfHousehold.firstName,
                lastName: headOfHousehold.lastName,
              };
            }
          }
        }

        return {
          ...record,
          member: finalMember,
          items,
        };
      })
    );

    return NextResponse.json({
      giving: givingRecords,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require giving_edit permission
    const { churchId } = await requirePermission("giving_edit", request);

    const body = await request.json();

    // Validate required fields
    if ((!body.memberId && !body.envelopeNumber) || !body.dateGiven) {
      return NextResponse.json(
        { error: "Member ID (or envelope number) and date given are required" },
        { status: 400 },
      );
    }

    // Validate items array
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "At least one giving item is required" },
        { status: 400 },
      );
    }

    // Validate items and filter out zero/null amounts
    const validItems = body.items
      .map((item: { categoryId: string; amount: number | string }) => {
        const amount = typeof item.amount === "string" ? parseFloat(item.amount) : item.amount;
        if (!item.categoryId || isNaN(amount) || amount <= 0) {
          return null;
        }
        return {
          categoryId: item.categoryId,
          amount: amount.toString(),
        };
      })
      .filter((item: { categoryId: string; amount: string } | null) => item !== null) as Array<{ categoryId: string; amount: string }>;

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "At least one item with a positive amount is required" },
        { status: 400 },
      );
    }

    // Verify all category IDs belong to this church
    const categoryIds = validItems.map(item => item.categoryId);
    const categories = await db
      .select()
      .from(givingCategories)
      .where(and(
        eq(givingCategories.churchId, churchId),
        eq(givingCategories.id, categoryIds[0]), // This needs to be fixed - check all IDs
      ));

    // Better validation: check each category
    for (const item of validItems) {
      const [category] = await db
        .select()
        .from(givingCategories)
        .where(and(
          eq(givingCategories.id, item.categoryId),
          eq(givingCategories.churchId, churchId),
        ))
        .limit(1);

      if (!category) {
        return NextResponse.json(
          { error: `Category ${item.categoryId} not found or does not belong to this church` },
          { status: 400 },
        );
      }
    }

    // Determine target member ID
    let targetMemberId: string;

    if (body.envelopeNumber) {
      // Find head of household for this envelope number
      const envelopeNum = parseInt(body.envelopeNumber, 10);
      if (isNaN(envelopeNum)) {
        return NextResponse.json(
          { error: "Invalid envelope number" },
          { status: 400 },
        );
      }

      // Handle guest (envelope number 0) - find a guest member
      if (envelopeNum === 0) {
        const [guestMember] = await db
          .select({ id: members.id })
          .from(members)
          .where(and(eq(members.membershipCode, "GUEST"), eq(members.churchId, churchId)))
          .limit(1);

        if (!guestMember) {
          return NextResponse.json(
            { error: "No guest member found. Please create a guest member through attendance records first." },
            { status: 404 },
          );
        }

        targetMemberId = guestMember.id;
      } else {
        // Find all members with this envelope number (filtered by churchId)
        const membersWithEnvelope = await db
          .select({
            id: members.id,
            householdId: members.householdId,
            sex: members.sex,
            dateOfBirth: members.dateOfBirth,
          })
          .from(members)
          .where(and(eq(members.envelopeNumber, envelopeNum), eq(members.churchId, churchId)));

        if (membersWithEnvelope.length === 0) {
          return NextResponse.json(
            { error: "No members found for this envelope number" },
            { status: 404 },
          );
        }

        // Find head of household using sequence column
        // Get household ID from first member with this envelope number
        const firstMember = membersWithEnvelope[0];
        if (firstMember.householdId) {
          const [headOfHousehold] = await db
            .select({ id: members.id })
            .from(members)
            .where(
              and(
                eq(members.householdId, firstMember.householdId),
                eq(members.sequence, "head_of_house")
              )
            )
            .limit(1);

          if (headOfHousehold) {
            targetMemberId = headOfHousehold.id;
          } else {
            // Fallback to first member if no head of house found
            targetMemberId = firstMember.id;
          }
        } else {
          // Fallback to first member if no household ID
          targetMemberId = firstMember.id;
        }
      }
    } else {
      // Use provided memberId
      targetMemberId = body.memberId;
    }

    // Check if member exists and belongs to church
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, targetMemberId), eq(members.churchId, churchId)))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    // Insert new giving record
    // Note: This creates one record per envelope number (household level)
    // The record is associated with the head of household member
    const [newGiving] = await db
      .insert(giving)
      .values({
        memberId: targetMemberId,
        dateGiven: body.dateGiven,
        notes: body.notes ? sanitizeText(body.notes) : null,
      })
      .returning();

    // Insert giving items
    await db
      .insert(givingItems)
      .values(
        validItems.map(item => ({
          givingId: newGiving.id,
          categoryId: item.categoryId,
          amount: item.amount,
        }))
      );

    // Fetch with member info and items
    const [givingWithMemberRaw] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        dateGiven: giving.dateGiven,
        notes: giving.notes,
        createdAt: giving.createdAt,
        updatedAt: giving.updatedAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          envelopeNumber: members.envelopeNumber,
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(eq(giving.id, newGiving.id))
      .limit(1);

    // Get items for this giving record
    const items = await db
      .select({
        categoryId: givingItems.categoryId,
        categoryName: givingCategories.name,
        amount: givingItems.amount,
      })
      .from(givingItems)
      .innerJoin(givingCategories, eq(givingItems.categoryId, givingCategories.id))
      .where(eq(givingItems.givingId, newGiving.id));

    // Find head of household using sequence column
    let headOfHouseholdMember = {
      id: givingWithMemberRaw.member.id,
      firstName: givingWithMemberRaw.member.firstName,
      lastName: givingWithMemberRaw.member.lastName,
    };

    // Get household ID from the member
    const [memberRecord] = await db
      .select({ householdId: members.householdId })
      .from(members)
      .where(eq(members.id, givingWithMemberRaw.member.id))
      .limit(1);

    if (memberRecord?.householdId) {
      const [headMember] = await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        })
        .from(members)
        .where(
          and(
            eq(members.householdId, memberRecord.householdId),
            eq(members.sequence, "head_of_house")
          )
        )
        .limit(1);

      if (headMember) {
        headOfHouseholdMember = {
          id: headMember.id,
          firstName: headMember.firstName,
          lastName: headMember.lastName,
        };
      }
    }

    const givingWithMember = {
      ...givingWithMemberRaw,
      member: headOfHouseholdMember,
      items,
    };

    return NextResponse.json({ giving: givingWithMember }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

