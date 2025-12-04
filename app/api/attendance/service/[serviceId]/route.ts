import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceId } = await params;

    // Check if service exists
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    // Get all attendance records for this service with member info
    const attendanceRecords = await db
      .select({
        id: attendance.id,
        memberId: attendance.memberId,
        serviceId: attendance.serviceId,
        attended: attendance.attended,
        tookCommunion: attendance.tookCommunion,
        createdAt: attendance.createdAt,
        updatedAt: attendance.updatedAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        },
        service: {
          id: services.id,
          serviceDate: services.serviceDate,
          serviceType: services.serviceType,
        },
      })
      .from(attendance)
      .innerJoin(members, eq(attendance.memberId, members.id))
      .innerJoin(services, eq(attendance.serviceId, services.id))
      .where(eq(attendance.serviceId, serviceId))
      .orderBy(members.lastName, members.firstName);

    return NextResponse.json({
      service,
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("Error fetching attendance for service:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance for service" },
      { status: 500 },
    );
  }
}

