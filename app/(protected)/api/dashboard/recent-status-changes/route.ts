import { NextResponse } from "next/server";
import { eq, desc, isNotNull, and } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get recent inactive members (participation = "inactive", which includes former "transferred") - filtered by churchId
    const inactiveMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        participation: members.participation,
        dateRemoved: members.dateRemoved,
        updatedAt: members.updatedAt,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(and(eq(members.participation, "inactive"), eq(members.churchId, churchId)))
      .orderBy(desc(members.updatedAt))
      .limit(5);

    // Get recent new members (dateReceived is not null) - filtered by churchId
    const newMembers = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        participation: members.participation,
        dateReceived: members.dateReceived,
        updatedAt: members.updatedAt,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(and(isNotNull(members.dateReceived), eq(members.churchId, churchId)))
      .orderBy(desc(members.dateReceived))
      .limit(5);

    // Combine and sort by most recent date
    const allChanges = [
      ...inactiveMembers.map((t) => ({
        ...t,
        type: "inactive" as const,
        date: t.dateRemoved || t.updatedAt,
      })),
      ...newMembers.map((m) => ({
        ...m,
        type: "new" as const,
        date: m.dateReceived || m.updatedAt,
      })),
    ]
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // Most recent first
      })
      .slice(0, 5); // Get top 5

    return NextResponse.json({ changes: allChanges });
  } catch (error) {
    return createErrorResponse(error);
  }
}

