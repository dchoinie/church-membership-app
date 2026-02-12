import { NextResponse } from "next/server";
import { eq, and, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { members, household } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

const DAYS_AHEAD = 90;
const MAX_EVENTS = 20;

type EventType = "baptism_anniversary" | "confirmation_anniversary" | "wedding_anniversary";

interface UpcomingEvent {
  type: EventType;
  label: string;
  date: string;
  memberId?: string;
  householdId?: string;
  memberName?: string;
  householdName?: string;
}

function getUpcomingAnniversaryDates(
  sourceDateStr: string,
  startDate: Date,
  endDate: Date
): Date[] {
  const match = sourceDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return [];
  const [, , month, day] = match;
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return [];

  const results: Date[] = [];
  const currentYear = startDate.getFullYear();

  const thisYear = new Date(currentYear, monthNum - 1, dayNum);
  if (thisYear >= startDate && thisYear <= endDate) results.push(thisYear);

  const nextYear = new Date(currentYear + 1, monthNum - 1, dayNum);
  if (nextYear >= startDate && nextYear <= endDate) results.push(nextYear);

  return results;
}

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + DAYS_AHEAD);
    endDate.setHours(23, 59, 59, 999);

    const events: UpcomingEvent[] = [];

    // Baptism anniversaries
    const membersWithBaptism = await db
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
        and(isNotNull(members.baptismDate), eq(members.churchId, churchId))
      );

    for (const m of membersWithBaptism) {
      if (!m.baptismDate) continue;
      const dates = getUpcomingAnniversaryDates(
        m.baptismDate,
        today,
        endDate
      );
      for (const d of dates) {
        events.push({
          type: "baptism_anniversary",
          label: "Baptism Anniversary",
          date: d.toISOString().split("T")[0],
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`,
          householdId: m.householdId ?? undefined,
          householdName: m.householdName ?? undefined,
        });
      }
    }

    // Confirmation anniversaries
    const membersWithConfirmation = await db
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
          eq(members.churchId, churchId)
        )
      );

    for (const m of membersWithConfirmation) {
      if (!m.confirmationDate) continue;
      const dates = getUpcomingAnniversaryDates(
        m.confirmationDate,
        today,
        endDate
      );
      for (const d of dates) {
        events.push({
          type: "confirmation_anniversary",
          label: "Confirmation Anniversary",
          date: d.toISOString().split("T")[0],
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`,
          householdId: m.householdId ?? undefined,
          householdName: m.householdName ?? undefined,
        });
      }
    }

    // Wedding anniversaries (member-level)
    const membersWithWedding = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        lastName: members.lastName,
        weddingAnniversaryDate: members.weddingAnniversaryDate,
        householdId: members.householdId,
        householdName: household.name,
      })
      .from(members)
      .leftJoin(household, eq(members.householdId, household.id))
      .where(
        and(
          isNotNull(members.weddingAnniversaryDate),
          eq(members.churchId, churchId)
        )
      );

    for (const m of membersWithWedding) {
      if (!m.weddingAnniversaryDate) continue;
      const dates = getUpcomingAnniversaryDates(
        m.weddingAnniversaryDate,
        today,
        endDate
      );
      for (const d of dates) {
        events.push({
          type: "wedding_anniversary",
          label: "Wedding Anniversary",
          date: d.toISOString().split("T")[0],
          memberId: m.id,
          memberName: `${m.firstName} ${m.lastName}`,
          householdId: m.householdId ?? undefined,
          householdName: m.householdName ?? undefined,
        });
      }
    }

    // Sort by date, then by type, limit
    events.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.label.localeCompare(b.label);
    });

    const limited = events.slice(0, MAX_EVENTS);

    return NextResponse.json({ events: limited });
  } catch (error) {
    return createErrorResponse(error);
  }
}
