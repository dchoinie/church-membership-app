import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc, count } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members } from "@/db/schema";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions
    const whereCondition = memberId ? eq(giving.memberId, memberId) : undefined;

    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(giving);
    const [totalResult] = whereCondition
      ? await countQuery.where(whereCondition)
      : await countQuery;
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated giving records with member info
    const queryBuilder = db
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
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt))
      .limit(validPageSize)
      .offset(offset);

    const givingRecordsRaw = whereCondition
      ? await queryBuilder.where(whereCondition)
      : await queryBuilder;

    // Helper function to find head of household (oldest male)
    const findHeadOfHousehold = (
      members: Array<{
        id: string;
        firstName: string;
        lastName: string;
        sex: "male" | "female" | "other" | null;
        dateOfBirth: string | null;
      }>
    ): { id: string; firstName: string; lastName: string } => {
      // Filter for males
      const males = members.filter(m => m.sex === "male");
      
      if (males.length > 0) {
        // Sort males by dateOfBirth (oldest first)
        const sortedMales = males.sort((a, b) => {
          if (!a.dateOfBirth) return 1; // No date goes to end
          if (!b.dateOfBirth) return -1;
          return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
        });
        return {
          id: sortedMales[0].id,
          firstName: sortedMales[0].firstName,
          lastName: sortedMales[0].lastName,
        };
      }
      
      // No males found, use oldest member overall
      const sortedAll = members.sort((a, b) => {
        if (!a.dateOfBirth) return 1; // No date goes to end
        if (!b.dateOfBirth) return -1;
        return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
      });
      
      return {
        id: sortedAll[0].id,
        firstName: sortedAll[0].firstName,
        lastName: sortedAll[0].lastName,
      };
    };

    // For each giving record, find the head of household
    const givingRecords = await Promise.all(
      givingRecordsRaw.map(async (record) => {
        // If the member has an envelope number, find all members with that envelope number
        if (record.member.envelopeNumber) {
          const householdMembers = await db
            .select({
              id: members.id,
              firstName: members.firstName,
              lastName: members.lastName,
              sex: members.sex,
              dateOfBirth: members.dateOfBirth,
            })
            .from(members)
            .where(eq(members.envelopeNumber, record.member.envelopeNumber));

          if (householdMembers.length > 0) {
            const headOfHousehold = findHeadOfHousehold(householdMembers);
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

        // Fallback: use the record's member if no envelope number or household members found
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
    console.error("Error fetching giving records:", error);
    return NextResponse.json(
      { error: "Failed to fetch giving records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

      // Find all members with this envelope number (with full details for age/sex determination)
      const membersWithEnvelope = await db
        .select({
          id: members.id,
          householdId: members.householdId,
          sex: members.sex,
          dateOfBirth: members.dateOfBirth,
        })
        .from(members)
        .where(eq(members.envelopeNumber, envelopeNum));

      if (membersWithEnvelope.length === 0) {
        return NextResponse.json(
          { error: "No members found for this envelope number" },
          { status: 404 },
        );
      }

      // Find head of household: oldest male member in the household
      // If no males, fallback to oldest member overall
      // If no dates, fallback to first member
      const findHeadOfHousehold = (members: typeof membersWithEnvelope): string => {
        // Filter for males
        const males = members.filter(m => m.sex === "male");
        
        if (males.length > 0) {
          // Sort males by dateOfBirth (oldest first)
          const sortedMales = males.sort((a, b) => {
            if (!a.dateOfBirth) return 1; // No date goes to end
            if (!b.dateOfBirth) return -1;
            return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          });
          return sortedMales[0].id;
        }
        
        // No males found, use oldest member overall
        const sortedAll = members.sort((a, b) => {
          if (!a.dateOfBirth) return 1; // No date goes to end
          if (!b.dateOfBirth) return -1;
          return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
        });
        
        return sortedAll[0].id;
      };

      targetMemberId = findHeadOfHousehold(membersWithEnvelope);
    } else {
      // Use provided memberId
      targetMemberId = body.memberId;
    }

    // Check if member exists
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, targetMemberId))
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
        notes: body.notes || null,
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

    // Find head of household (oldest male) if envelope number exists
    let headOfHouseholdMember = {
      id: givingWithMemberRaw.member.id,
      firstName: givingWithMemberRaw.member.firstName,
      lastName: givingWithMemberRaw.member.lastName,
    };

    if (givingWithMemberRaw.member.envelopeNumber) {
      const householdMembers = await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          sex: members.sex,
          dateOfBirth: members.dateOfBirth,
        })
        .from(members)
        .where(eq(members.envelopeNumber, givingWithMemberRaw.member.envelopeNumber));

      if (householdMembers.length > 0) {
        // Filter for males
        const males = householdMembers.filter(m => m.sex === "male");
        
        if (males.length > 0) {
          // Sort males by dateOfBirth (oldest first)
          const sortedMales = males.sort((a, b) => {
            if (!a.dateOfBirth) return 1;
            if (!b.dateOfBirth) return -1;
            return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          });
          headOfHouseholdMember = {
            id: sortedMales[0].id,
            firstName: sortedMales[0].firstName,
            lastName: sortedMales[0].lastName,
          };
        } else {
          // No males, use oldest member overall
          const sortedAll = householdMembers.sort((a, b) => {
            if (!a.dateOfBirth) return 1;
            if (!b.dateOfBirth) return -1;
            return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          });
          headOfHouseholdMember = {
            id: sortedAll[0].id,
            firstName: sortedAll[0].firstName,
            lastName: sortedAll[0].lastName,
          };
        }
      }
    }

    const givingWithMember = {
      ...givingWithMemberRaw,
      member: headOfHouseholdMember,
    };

    return NextResponse.json({ giving: givingWithMember }, { status: 201 });
  } catch (error) {
    console.error("Error creating giving record:", error);
    return NextResponse.json(
      { error: "Failed to create giving record" },
      { status: 500 },
    );
  }
}

