import { NextResponse } from "next/server";
import { eq, desc, isNotNull, and, gte } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { decrypt } from "@/lib/encryption";

// Date 90 days ago (inclusive) - only show changes within last 90 days
function getNinetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split("T")[0];
}

// Check if a birthday (YYYY-MM-DD) fell within the last 90 days
function birthdayInLast90Days(dateOfBirthStr: string, ninetyDaysAgo: string): { inRange: boolean; occurrenceDate: string | null } {
  const match = dateOfBirthStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { inRange: false, occurrenceDate: null };
  const [, , month, day] = match;
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return { inRange: false, occurrenceDate: null };

  const today = new Date();
  const start = new Date(ninetyDaysAgo);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const currentYear = today.getFullYear();
  const thisYearBirthday = new Date(currentYear, monthNum - 1, dayNum);
  const lastYearBirthday = new Date(currentYear - 1, monthNum - 1, dayNum);

  if (thisYearBirthday >= start && thisYearBirthday <= end) {
    return { inRange: true, occurrenceDate: thisYearBirthday.toISOString().split("T")[0] };
  }
  if (lastYearBirthday >= start && lastYearBirthday <= end) {
    return { inRange: true, occurrenceDate: lastYearBirthday.toISOString().split("T")[0] };
  }
  return { inRange: false, occurrenceDate: null };
}

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);
    const ninetyDaysAgo = getNinetyDaysAgo();

    // Get confirmations within last 90 days
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
      .where(
        and(
          isNotNull(members.confirmationDate),
          gte(members.confirmationDate, ninetyDaysAgo),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.confirmationDate))
      .limit(10);

    // Get baptisms within last 90 days
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
      .where(
        and(
          isNotNull(members.baptismDate),
          gte(members.baptismDate, ninetyDaysAgo),
          eq(members.churchId, churchId),
        ),
      )
      .orderBy(desc(members.baptismDate))
      .limit(10);

    // Get transfers in (date received) within last 90 days
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
          gte(members.dateReceived, ninetyDaysAgo),
          eq(members.receivedBy, "transfer"),
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

    // Get members with dateOfBirth for birthday check (last 90 days)
    const membersWithBirthday = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        dateOfBirth: members.dateOfBirth,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(
        and(
          isNotNull(members.dateOfBirth),
          eq(members.churchId, churchId),
        ),
      );

    const birthdays = membersWithBirthday
      .map((m) => {
        let dob = "";
        try {
          dob = m.dateOfBirth ? decrypt(m.dateOfBirth) : "";
        } catch {
          return null;
        }
        if (!dob) return null;
        const { inRange, occurrenceDate } = birthdayInLast90Days(dob, ninetyDaysAgo);
        if (!inRange || !occurrenceDate) return null;
        return {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          date: occurrenceDate,
          householdName: m.householdName,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

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

    // Combine: transfer in, date removed, confirmation, baptism, deceased, birthday
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
      ...deceased.map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        changeType: "deceased" as const,
        date: d.deceasedDate || "",
        householdName: d.householdName,
      })),
      ...birthdays.map((b) => ({
        id: b.id,
        firstName: b.firstName,
        lastName: b.lastName,
        changeType: "birthday" as const,
        date: b.date,
        householdName: b.householdName,
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
