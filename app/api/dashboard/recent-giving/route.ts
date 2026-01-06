import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";

import { db } from "@/db";
import { giving, members, household } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get 5 most recent giving records with household name (filtered by churchId)
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
      .where(eq(members.churchId, churchId))
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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching recent giving:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent giving" },
      { status: 500 },
    );
  }
}

