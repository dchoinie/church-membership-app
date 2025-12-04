import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, ne } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get attendance record with member and service info
    const [attendanceRecord] = await db
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
      .where(eq(attendance.id, id))
      .limit(1);

    if (!attendanceRecord) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ attendance: attendanceRecord });
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance record" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if attendance record exists
    const [existingAttendance] = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1);

    if (!existingAttendance) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    // Validate boolean fields
    if (body.attended !== undefined && typeof body.attended !== "boolean") {
      return NextResponse.json(
        { error: "attended must be a boolean" },
        { status: 400 },
      );
    }

    if (body.tookCommunion !== undefined && typeof body.tookCommunion !== "boolean") {
      return NextResponse.json(
        { error: "tookCommunion must be a boolean" },
        { status: 400 },
      );
    }

    // Validate: Cannot take communion without attending
    const finalAttended = body.attended !== undefined ? body.attended : existingAttendance.attended;
    const finalTookCommunion = body.tookCommunion !== undefined ? body.tookCommunion : existingAttendance.tookCommunion;
    
    if (finalTookCommunion && !finalAttended) {
      return NextResponse.json(
        { error: "Cannot take communion without attending" },
        { status: 400 },
      );
    }

    // If serviceId is being changed, validate it exists and check for uniqueness
    let serviceId = existingAttendance.serviceId;
    if (body.serviceId !== undefined && body.serviceId !== existingAttendance.serviceId) {
      // Check if service exists
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, body.serviceId))
        .limit(1);

      if (!service) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 400 },
        );
      }

      // Check if another record exists with same memberId and new serviceId
      const [duplicate] = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.memberId, existingAttendance.memberId),
            eq(attendance.serviceId, body.serviceId),
            ne(attendance.id, id),
          ),
        )
        .limit(1);

      if (duplicate) {
        return NextResponse.json(
          { error: "Attendance record already exists for this member and service" },
          { status: 400 },
        );
      }

      serviceId = body.serviceId;
    }

    // Update attendance record
    await db
      .update(attendance)
      .set({
        attended: body.attended !== undefined ? body.attended : existingAttendance.attended,
        tookCommunion: body.tookCommunion !== undefined ? body.tookCommunion : existingAttendance.tookCommunion,
        serviceId,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, id));

    // Fetch with member and service info
    const [attendanceWithMember] = await db
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
      .where(eq(attendance.id, id))
      .limit(1);

    return NextResponse.json({ attendance: attendanceWithMember });
  } catch (error) {
    console.error("Error updating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 },
    );
  }
}

