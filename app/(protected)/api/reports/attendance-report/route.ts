import { NextResponse } from "next/server";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attendance, services, members } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

// Helper function to escape CSV values
function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// Helper function to generate CSV content
function generateCsv(rows: Array<Record<string, string | null>>, headers?: string[]): string {
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

export async function GET(request: Request) {
  try {
    // Allow all authenticated users to view reports
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 },
      );
    }

    // Get all services in the date range (filtered by churchId)
    const servicesInRange = await db
      .select({
        id: services.id,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
      })
      .from(services)
      .where(
        and(
          eq(services.churchId, churchId),
          gte(services.serviceDate, startDate),
          lte(services.serviceDate, endDate),
        ),
      )
      .orderBy(services.serviceDate);

    // Get all attendance records with member info for these services
    const serviceIds = servicesInRange.map((s) => s.id);
    
    if (serviceIds.length === 0) {
      // No services in range, return empty CSV
      const csvContent = generateCsv([], [
        "Service Date",
        "Service Type",
        "Total Attendance",
        "Total Members",
        "Total Guests",
        "Total Communion",
      ]);
      const filename = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Get all attendance records with member info for these services
    const allAttendance = await db
      .select({
        serviceId: attendance.serviceId,
        attended: attendance.attended,
        tookCommunion: attendance.tookCommunion,
        membershipCode: members.membershipCode,
      })
      .from(attendance)
      .innerJoin(members, eq(attendance.memberId, members.id))
      .where(
        and(
          eq(members.churchId, churchId),
          inArray(attendance.serviceId, serviceIds),
        ),
      );

    // Calculate stats for each service
    const serviceStats = servicesInRange.map((service) => {
      const serviceAttendance = allAttendance.filter((a) => a.serviceId === service.id);
      
      const totalAttendance = serviceAttendance.filter((a) => a.attended).length;
      const totalMembers = serviceAttendance.filter(
        (a) => a.attended && a.membershipCode !== "GUEST"
      ).length;
      const totalGuests = serviceAttendance.filter(
        (a) => a.attended && a.membershipCode === "GUEST"
      ).length;
      const totalCommunion = serviceAttendance.filter((a) => a.tookCommunion).length;

      return {
        serviceDate: service.serviceDate,
        serviceType: service.serviceType,
        totalAttendance: totalAttendance.toString(),
        totalMembers: totalMembers.toString(),
        totalGuests: totalGuests.toString(),
        totalCommunion: totalCommunion.toString(),
      };
    });

    if (format === "json") {
      return NextResponse.json({ services: serviceStats });
    }

    // Generate CSV
    const csvRows = serviceStats.map((stat) => ({
      "Service Date": stat.serviceDate,
      "Service Type": stat.serviceType,
      "Total Attendance": stat.totalAttendance,
      "Total Members": stat.totalMembers,
      "Total Guests": stat.totalGuests,
      "Total Communion": stat.totalCommunion,
    }));

    const csvContent = generateCsv(csvRows);
    const filename = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;

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
