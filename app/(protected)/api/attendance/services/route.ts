import { NextResponse } from "next/server";
import { eq, desc, sql, and, count } from "drizzle-orm";

import { db } from "@/db";
import { attendance, services } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize));
    const offset = (validPage - 1) * validPageSize;

    // Get services with attendance statistics (filtered by churchId)
    // Group by service and count attendees and communion participants
    const servicesWithStats = await db
      .select({
        serviceId: services.id,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTime: services.serviceTime,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        attendeesCount: sql<number>`count(${attendance.id})::int`.as("attendees_count"),
        communionCount: sql<number>`count(case when ${attendance.tookCommunion} = true then 1 end)::int`.as("communion_count"),
      })
      .from(services)
      .leftJoin(attendance, eq(services.id, attendance.serviceId))
      .where(eq(services.churchId, churchId))
      .groupBy(services.id, services.serviceDate, services.serviceType, services.serviceTime, services.createdAt, services.updatedAt)
      .orderBy(desc(services.serviceDate), desc(services.id))
      .limit(validPageSize)
      .offset(offset);

    // Get total count of all services for this church (must match the data query's
    // where clause exactly, or pagination metadata won't line up with what's returned)
    const [totalResult] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.churchId, churchId));

    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / validPageSize);

    return NextResponse.json({
      services: servicesWithStats,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

