import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { serviceId } = await params;

    // Check if service exists and belongs to church
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.churchId, churchId)))
      .limit(1);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 },
      );
    }

    // Get all attendance records for this service with member info (filtered by churchId)
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
      .where(and(
        eq(attendance.serviceId, serviceId),
        eq(members.churchId, churchId),
        eq(services.churchId, churchId)
      ))
      .orderBy(members.lastName, members.firstName);

    return NextResponse.json({
      service,
      attendance: attendanceRecords,
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching attendance for service:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance for service" },
      { status: 500 },
    );
  }
}

