import { NextResponse } from "next/server";
import { and, gte, lte, eq, sql, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { members, services, attendance } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

// Helper function to escape CSV values
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  // If the value contains comma, newline, or quote, wrap it in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to generate CSV content
function generateCsv(rows: Array<Record<string, string | number | null>>, headers?: string[]): string {
  if (rows.length === 0) {
    // If headers provided, return just headers
    if (headers && headers.length > 0) {
      return headers.map(escapeCsvValue).join(",");
    }
    return "";
  }
  
  const csvHeaders = headers || Object.keys(rows[0]);
  const headerRow = csvHeaders.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(",")
  );
  
  return [headerRow, ...dataRows].join("\n");
}

// Helper function to calculate age at a given date
function calculateAgeAtDate(birthDate: string | null, targetDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  const age = target.getFullYear() - birth.getFullYear();
  const monthDiff = target.getMonth() - birth.getMonth();
  const dayDiff = target.getDate() - birth.getDate();
  return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
}

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view reports
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const startDate = startDateParam;
    const endDate = endDateParam;

    // 1. Total Baptized Membership - count all members with baptism_date (filtered by churchId)
    const totalBaptizedResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.churchId, churchId), isNotNull(members.baptismDate)));

    const totalBaptizedMembership = totalBaptizedResult[0]?.count || 0;

    // 2. Number baptized during the year - split by age at baptism
    const baptizedDuringYear = await db
      .select({
        id: members.id,
        baptismDate: members.baptismDate,
        dateOfBirth: members.dateOfBirth,
      })
      .from(members)
      .where(
        and(
          eq(members.churchId, churchId),
          isNotNull(members.baptismDate),
          gte(members.baptismDate, startDate),
          lte(members.baptismDate, endDate)
        )
      );

    let baptizedInfantChildren = 0;
    let baptizedAdults = 0;

    baptizedDuringYear.forEach((member) => {
      if (member.baptismDate && member.dateOfBirth) {
        const age = calculateAgeAtDate(member.dateOfBirth, member.baptismDate);
        if (age !== null) {
          if (age < 18) {
            baptizedInfantChildren++;
          } else {
            baptizedAdults++;
          }
        }
      }
    });

    // 3. Total Confirmed Membership - count all members with confirmation_date (filtered by churchId)
    const totalConfirmedResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.churchId, churchId), isNotNull(members.confirmationDate)));

    const totalConfirmedMembership = totalConfirmedResult[0]?.count || 0;

    // 4. Confirmation Gains - count confirmations in reporting year, split by age
    const confirmationsDuringYear = await db
      .select({
        id: members.id,
        confirmationDate: members.confirmationDate,
        dateOfBirth: members.dateOfBirth,
      })
      .from(members)
      .where(
        and(
          eq(members.churchId, churchId),
          isNotNull(members.confirmationDate),
          gte(members.confirmationDate, startDate),
          lte(members.confirmationDate, endDate)
        )
      );

    let confirmationJuniors = 0;
    let confirmationAdults = 0;

    confirmationsDuringYear.forEach((member) => {
      if (member.confirmationDate && member.dateOfBirth) {
        const age = calculateAgeAtDate(member.dateOfBirth, member.confirmationDate);
        if (age !== null) {
          if (age < 18) {
            confirmationJuniors++;
          } else {
            confirmationAdults++;
          }
        }
      }
    });

    // 5. Losses - count members with deceased_date or date_removed in reporting year
    const lossesDeceased = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(
        and(
          eq(members.churchId, churchId),
          isNotNull(members.deceasedDate),
          gte(members.deceasedDate, startDate),
          lte(members.deceasedDate, endDate)
        )
      );

    const lossesRemoved = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(members)
      .where(
        and(
          eq(members.churchId, churchId),
          isNotNull(members.dateRemoved),
          gte(members.dateRemoved, startDate),
          lte(members.dateRemoved, endDate)
        )
      );

    const totalLosses = (lossesDeceased[0]?.count || 0) + (lossesRemoved[0]?.count || 0);

    // 6. Weekly Church Attendance - average attendance for divine_service type services
    // First get the count of divine services
    const divineServiceCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(services)
      .where(
        and(
          eq(services.serviceType, "divine_service"),
          gte(services.serviceDate, startDate),
          lte(services.serviceDate, endDate)
        )
      );

    const divineServiceCount = divineServiceCountResult[0]?.count || 0;

    // Then get total attendance for those services
    const totalDivineServiceAttendanceResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendance)
      .innerJoin(services, eq(attendance.serviceId, services.id))
      .where(
        and(
          eq(services.serviceType, "divine_service"),
          gte(services.serviceDate, startDate),
          lte(services.serviceDate, endDate),
          eq(attendance.attended, true)
        )
      );

    const totalDivineServiceAttendance = totalDivineServiceAttendanceResult[0]?.count || 0;

    const weeklyChurchAttendance = divineServiceCount > 0
      ? Math.round((totalDivineServiceAttendance / divineServiceCount) * 100) / 100
      : 0;

    // 7. Average visitors per service - removed as "visitor" status no longer exists
    // (visitor status was consolidated into "active")
    const averageVisitorsPerService = 0;

    // Generate CSV
    const csvRows = [
      {
        "Metric": "Total Baptized Membership",
        "Value": totalBaptizedMembership,
      },
      {
        "Metric": "Number Baptized During Year - Infant/Children (<18)",
        "Value": baptizedInfantChildren,
      },
      {
        "Metric": "Number Baptized During Year - Adults (18+)",
        "Value": baptizedAdults,
      },
      {
        "Metric": "Total Number Baptized During Year",
        "Value": baptizedInfantChildren + baptizedAdults,
      },
      {
        "Metric": "Total Confirmed Membership",
        "Value": totalConfirmedMembership,
      },
      {
        "Metric": "Confirmation Gains - Juniors (<18)",
        "Value": confirmationJuniors,
      },
      {
        "Metric": "Confirmation Gains - Adults (18+)",
        "Value": confirmationAdults,
      },
      {
        "Metric": "Total Confirmation Gains",
        "Value": confirmationJuniors + confirmationAdults,
      },
      {
        "Metric": "Losses (Deceased or Removed)",
        "Value": totalLosses,
      },
      {
        "Metric": "Weekly Church Attendance (Average)",
        "Value": weeklyChurchAttendance,
      },
      {
        "Metric": "Average Visitors Per Service",
        "Value": averageVisitorsPerService,
      },
    ];

    const csvContent = generateCsv(csvRows);
    const filename = `congressional-statistics-report-${startDate}-to-${endDate}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
