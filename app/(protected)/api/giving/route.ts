import { NextResponse } from "next/server";
import { eq, desc, count, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members } from "@/db/schema";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
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
        currentAmount: giving.currentAmount,
        missionAmount: giving.missionAmount,
        memorialsAmount: giving.memorialsAmount,
        debtAmount: giving.debtAmount,
        schoolAmount: giving.schoolAmount,
        miscellaneousAmount: giving.miscellaneousAmount,
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

    // For each giving record, find the head of household using sequence column
    const givingRecords = await Promise.all(
      givingRecordsRaw.map(async (record) => {
        // If the member has an envelope number, find head of household with sequence = "head_of_house"
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
              return {
                ...record,
                member: {
                  id: headOfHousehold.id,
                  firstName: headOfHousehold.firstName,
                  lastName: headOfHousehold.lastName,
                },
              };
            }
          }
        }

        // Fallback: use the record's member if no envelope number or head of household not found
        return {
          ...record,
          member: {
            id: record.member.id,
            firstName: record.member.firstName,
            lastName: record.member.lastName,
          },
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

    // Require admin role
    const { churchId } = await requireAdmin(request);

    const body = await request.json();

    // Validate required fields
    if ((!body.memberId && !body.envelopeNumber) || !body.dateGiven) {
      return NextResponse.json(
        { error: "Member ID (or envelope number) and date given are required" },
        { status: 400 },
      );
    }

    // Validate at least one amount is provided
    const currentAmount = body.currentAmount ? parseFloat(body.currentAmount) : null;
    const missionAmount = body.missionAmount ? parseFloat(body.missionAmount) : null;
    const memorialsAmount = body.memorialsAmount ? parseFloat(body.memorialsAmount) : null;
    const debtAmount = body.debtAmount ? parseFloat(body.debtAmount) : null;
    const schoolAmount = body.schoolAmount ? parseFloat(body.schoolAmount) : null;
    const miscellaneousAmount = body.miscellaneousAmount ? parseFloat(body.miscellaneousAmount) : null;

    if (!currentAmount && !missionAmount && !memorialsAmount && !debtAmount && !schoolAmount && !miscellaneousAmount) {
      return NextResponse.json(
        { error: "At least one amount is required" },
        { status: 400 },
      );
    }

    // Validate amounts are non-negative numbers
    if (currentAmount !== null && (isNaN(currentAmount) || currentAmount < 0)) {
      return NextResponse.json(
        { error: "Current amount must be a non-negative number" },
        { status: 400 },
      );
    }
    if (missionAmount !== null && (isNaN(missionAmount) || missionAmount < 0)) {
      return NextResponse.json(
        { error: "Mission amount must be a non-negative number" },
        { status: 400 },
      );
    }
    if (memorialsAmount !== null && (isNaN(memorialsAmount) || memorialsAmount < 0)) {
      return NextResponse.json(
        { error: "Memorials amount must be a non-negative number" },
        { status: 400 },
      );
    }
    if (debtAmount !== null && (isNaN(debtAmount) || debtAmount < 0)) {
      return NextResponse.json(
        { error: "Debt amount must be a non-negative number" },
        { status: 400 },
      );
    }
    if (schoolAmount !== null && (isNaN(schoolAmount) || schoolAmount < 0)) {
      return NextResponse.json(
        { error: "School amount must be a non-negative number" },
        { status: 400 },
      );
    }
    if (miscellaneousAmount !== null && (isNaN(miscellaneousAmount) || miscellaneousAmount < 0)) {
      return NextResponse.json(
        { error: "Miscellaneous amount must be a non-negative number" },
        { status: 400 },
      );
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
        currentAmount: currentAmount !== null ? currentAmount.toString() : null,
        missionAmount: missionAmount !== null ? missionAmount.toString() : null,
        memorialsAmount: memorialsAmount !== null ? memorialsAmount.toString() : null,
        debtAmount: debtAmount !== null ? debtAmount.toString() : null,
        schoolAmount: schoolAmount !== null ? schoolAmount.toString() : null,
        miscellaneousAmount: miscellaneousAmount !== null ? miscellaneousAmount.toString() : null,
        dateGiven: body.dateGiven,
        notes: body.notes ? sanitizeText(body.notes) : null,
      })
      .returning();

    // Fetch with member info (including envelope number for head of household lookup)
    const [givingWithMemberRaw] = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        currentAmount: giving.currentAmount,
        missionAmount: giving.missionAmount,
        memorialsAmount: giving.memorialsAmount,
        debtAmount: giving.debtAmount,
        schoolAmount: giving.schoolAmount,
        miscellaneousAmount: giving.miscellaneousAmount,
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
    };

    return NextResponse.json({ giving: givingWithMember }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}

