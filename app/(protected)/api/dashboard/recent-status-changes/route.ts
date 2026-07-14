import { NextResponse } from "next/server";
import { eq, desc, isNotNull, and, gte } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

// Date 90 days ago (inclusive) - only show changes within last 90 days
function getNinetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);
    const ninetyDaysAgo = getNinetyDaysAgo();

    // Get members added (date received) within last 90 days
    const added = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        dateReceived: members.dateReceived,
        receivedBy: members.receivedBy,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(
        and(
          isNotNull(members.dateReceived),
          gte(members.dateReceived, ninetyDaysAgo),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.dateReceived))
      .limit(10);

    // Get deceased dates within last 90 days
    const deceased = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        deceasedDate: members.deceasedDate,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(
        and(
          isNotNull(members.deceasedDate),
          gte(members.deceasedDate, ninetyDaysAgo),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.deceasedDate))
      .limit(10);

    // Get date removed within last 90 days (all removed types: transfer out, death, etc.)
    const dateRemoved = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        dateRemoved: members.dateRemoved,
        removedBy: members.removedBy,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(
        and(
          isNotNull(members.dateRemoved),
          gte(members.dateRemoved, ninetyDaysAgo),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.dateRemoved))
      .limit(10);

    // Combine: added (date received), deceased, date removed
    const allChanges = [
      ...added.map((a) => ({
        id: a.id,
        firstName: a.firstName,
        lastName: a.lastName,
        changeType:
          a.receivedBy === "transfer"
            ? ("transfer_in" as const)
            : ("received" as const),
        date: a.dateReceived || "",
        receivedBy: a.receivedBy || undefined,
        householdName: a.householdName,
      })),
      ...deceased.map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        changeType: "deceased" as const,
        date: d.deceasedDate || "",
        householdName: d.householdName,
      })),
      ...dateRemoved.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        changeType:
          r.removedBy === "transfer"
            ? ("transfer_out" as const)
            : ("removed" as const),
        date: r.dateRemoved || "",
        removedBy: r.removedBy || undefined,
        householdName: r.householdName,
      })),
    ]
      .filter((change) => change.date)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      })
      .slice(0, 5); // Get top 5

    return NextResponse.json({ changes: allChanges });
  } catch (error) {
    return createErrorResponse(error);
  }
}
