import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { memberId } = await params;

    // Get member info and verify it belongs to church
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.churchId, churchId)))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    // Determine which member's giving records to fetch
    // Use the member's envelope number to find head of household if applicable
    let targetMemberId = memberId;

    if (member.envelopeNumber) {
      // Find all members with this envelope number (filtered by churchId)
      const householdMembers = await db
        .select({
          id: members.id,
          sex: members.sex,
          dateOfBirth: members.dateOfBirth,
        })
        .from(members)
        .where(and(eq(members.envelopeNumber, member.envelopeNumber), eq(members.churchId, churchId)));

      if (householdMembers.length > 0) {
        // Find head of household: oldest male member
        const males = householdMembers.filter(m => m.sex === "male");
        
        if (males.length > 0) {
          const sortedMales = males.sort((a, b) => {
            if (!a.dateOfBirth) return 1;
            if (!b.dateOfBirth) return -1;
            return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          });
          targetMemberId = sortedMales[0].id;
        } else {
          // No males, use oldest member overall
          const sortedAll = householdMembers.sort((a, b) => {
            if (!a.dateOfBirth) return 1;
            if (!b.dateOfBirth) return -1;
            return new Date(a.dateOfBirth).getTime() - new Date(b.dateOfBirth).getTime();
          });
          targetMemberId = sortedAll[0].id;
        }
      }
    }

    // Get all giving records for the target member (head of household)
    const givingRecords = await db
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
        },
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .where(and(eq(giving.memberId, targetMemberId), eq(members.churchId, churchId)))
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt));

    return NextResponse.json({ giving: givingRecords });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching member giving records:", error);
    return NextResponse.json(
      { error: "Failed to fetch member giving records" },
      { status: 500 },
    );
  }
}

