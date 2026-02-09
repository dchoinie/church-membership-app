import { NextResponse } from "next/server";
import { eq, desc, sql, and } from "drizzle-orm";

import { db } from "@/db";
import { services, attendance } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get 5 most recent services with attendance statistics (filtered by churchId)
    const recentServices = await db
      .select({
        serviceId: services.id,
        serviceDate: services.serviceDate,
        serviceType: services.serviceType,
        serviceTime: services.serviceTime,
        attendeesCount: sql<number>`count(case when ${attendance.attended} = true then 1 end)::int`.as("attendees_count"),
        communionCount: sql<number>`count(case when ${attendance.tookCommunion} = true then 1 end)::int`.as("communion_count"),
      })
      .from(services)
      .leftJoin(attendance, eq(services.id, attendance.serviceId))
      .where(eq(services.churchId, churchId))
      .groupBy(services.id, services.serviceDate, services.serviceType, services.serviceTime)
      .orderBy(desc(services.serviceDate))
      .limit(5);

    return NextResponse.json({ services: recentServices });
  } catch (error) {
    return createErrorResponse(error);
  }
}
