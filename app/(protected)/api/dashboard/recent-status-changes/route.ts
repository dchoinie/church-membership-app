import { NextResponse } from "next/server";
import { eq, desc, isNotNull, and, or } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get recent confirmations
    const confirmations = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        confirmationDate: members.confirmationDate,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(and(isNotNull(members.confirmationDate), eq(members.churchId, churchId)))
      .orderBy(desc(members.confirmationDate))
      .limit(5);

    // Get recent baptisms
    const baptisms = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        baptismDate: members.baptismDate,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(and(isNotNull(members.baptismDate), eq(members.churchId, churchId)))
      .orderBy(desc(members.baptismDate))
      .limit(5);

    // Get transfers in (dateReceived with receivedBy = "transfer")
    const transfersIn = await db
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
          eq(members.receivedBy, "transfer"),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.dateReceived))
      .limit(5);

    // Get transfers out (dateRemoved with removedBy = "transfer")
    const transfersOut = await db
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
          eq(members.removedBy, "transfer"),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.dateRemoved))
      .limit(5);

    // Get other received (dateReceived but not transfer)
    const otherReceived = await db
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
          eq(members.churchId, churchId),
          or(
            eq(members.receivedBy, "adult_confirmation"),
            eq(members.receivedBy, "affirmation_of_faith"),
            eq(members.receivedBy, "baptism"),
            eq(members.receivedBy, "junior_confirmation"),
            eq(members.receivedBy, "with_parents"),
            eq(members.receivedBy, "other_denomination"),
            eq(members.receivedBy, "unknown"),
          ),
        ),
      )
      .orderBy(desc(members.dateReceived))
      .limit(5);

    // Get other removed (dateRemoved but not transfer)
    const otherRemoved = await db
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
          eq(members.churchId, churchId),
          or(
            eq(members.removedBy, "death"),
            eq(members.removedBy, "excommunication"),
            eq(members.removedBy, "inactivity"),
            eq(members.removedBy, "moved_no_transfer"),
            eq(members.removedBy, "released"),
            eq(members.removedBy, "removed_by_request"),
            eq(members.removedBy, "other"),
          ),
        ),
      )
      .orderBy(desc(members.dateRemoved))
      .limit(5);

    // Combine all changes with their types
    const allChanges = [
      ...confirmations.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        changeType: "confirmation" as const,
        date: c.confirmationDate || "",
        householdName: c.householdName,
      })),
      ...baptisms.map((b) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        changeType: "baptism" as const,
        date: b.baptismDate || "",
        householdName: b.householdName,
      })),
      ...transfersIn.map((t) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        changeType: "transfer_in" as const,
        date: t.dateReceived || "",
        receivedBy: t.receivedBy || undefined,
        householdName: t.householdName,
      })),
      ...transfersOut.map((t) => ({
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        changeType: "transfer_out" as const,
        date: t.dateRemoved || "",
        removedBy: t.removedBy || undefined,
        householdName: t.householdName,
      })),
      ...otherReceived.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        changeType: "received" as const,
        date: r.dateReceived || "",
        receivedBy: r.receivedBy || undefined,
        householdName: r.householdName,
      })),
      ...otherRemoved.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        changeType: "removed" as const,
        date: r.dateRemoved || "",
        removedBy: r.removedBy || undefined,
        householdName: r.householdName,
      })),
    ]
      .filter((change) => change.date) // Filter out entries without dates
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
