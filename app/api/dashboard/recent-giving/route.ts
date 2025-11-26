import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { giving, members, household } from "@/db/schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get 5 most recent giving records with household name
    const recentGiving = await db
      .select({
        id: giving.id,
        dateGiven: giving.dateGiven,
        householdId: household.id,
        householdName: household.name,
        memberFirstName: members.firstName,
        memberLastName: members.lastName,
      })
      .from(giving)
      .innerJoin(members, eq(giving.memberId, members.id))
      .leftJoin(household, eq(members.householdId, household.id))
      .orderBy(desc(giving.dateGiven), desc(giving.createdAt))
      .limit(5);

    // Format the response with household display name
    const formattedGiving = recentGiving.map((record) => {
      // Use household name if available, otherwise use member name
      const displayName = record.householdName 
        ? record.householdName
        : `${record.memberFirstName} ${record.memberLastName}`;
      
      return {
        id: record.id,
        dateGiven: record.dateGiven,
        householdName: displayName,
      };
    });

    return NextResponse.json({ giving: formattedGiving });
  } catch (error) {
    console.error("Error fetching recent giving:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent giving" },
      { status: 500 },
    );
  }
}

