import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc, isNotNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { members, household } from "@/db/schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent transfers (participation = "transferred")
    const transfers = await db
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
      .where(eq(members.participation, "transferred"))
      .orderBy(desc(members.updatedAt))
      .limit(5);

    // Get recent new members (dateReceived is not null)
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
      .where(isNotNull(members.dateReceived))
      .orderBy(desc(members.dateReceived))
      .limit(5);

    // Combine and sort by most recent date
    const allChanges = [
      ...transfers.map((t) => ({
        ...t,
        type: "transferred" as const,
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
    console.error("Error fetching recent status changes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent status changes" },
      { status: 500 },
    );
  }
}

