import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc, and, or } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members, families } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { memberId } = await params;

    // Get member info
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 },
      );
    }

    // Determine which member's giving records to fetch
    let targetMemberId = memberId;

    // If member is not head of household, find the head of household in their family
    if (!member.headOfHousehold && member.familyId) {
      const [headOfHousehold] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.familyId, member.familyId),
            eq(members.headOfHousehold, true),
          ),
        )
        .limit(1);

      if (headOfHousehold) {
        targetMemberId = headOfHousehold.id;
      }
    }

    // Get all giving records for the target member (head of household)
    const givingRecords = await db
      .select({
        id: giving.id,
        memberId: giving.memberId,
        amount: giving.amount,
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
      .where(eq(giving.memberId, targetMemberId))
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt));

    return NextResponse.json({ giving: givingRecords });
  } catch (error) {
    console.error("Error fetching member giving records:", error);
    return NextResponse.json(
      { error: "Failed to fetch member giving records" },
      { status: 500 },
    );
  }
}

