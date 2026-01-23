import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";

import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";
import { getAuthContext, requirePermission } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { churchId } = await getAuthContext(request);
    const { id } = await params;

    // Get attendance record with member and service info (filtered by churchId)
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
      .where(and(
        eq(attendance.id, id),
        eq(members.churchId, churchId),
        eq(services.churchId, churchId)
      ))
      .limit(1);

    if (!attendanceRecord) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ attendance: attendanceRecord });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require attendance_edit permission
    const { churchId } = await requirePermission("attendance_edit", request);
    const { id } = await params;
    const body = await request.json();

    // Check if attendance record exists and belongs to church
    const [existingAttendance] = await db
      .select({
        id: attendance.id,
        memberId: attendance.memberId,
        serviceId: attendance.serviceId,
        attended: attendance.attended,
        tookCommunion: attendance.tookCommunion,
      })
      .from(attendance)
      .innerJoin(members, eq(attendance.memberId, members.id))
      .innerJoin(services, eq(attendance.serviceId, services.id))
      .where(and(
        eq(attendance.id, id),
        eq(members.churchId, churchId),
        eq(services.churchId, churchId)
      ))
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

    // If serviceId is being changed, validate it exists and belongs to church
    let serviceId = existingAttendance.serviceId;
    if (body.serviceId !== undefined && body.serviceId !== existingAttendance.serviceId) {
      // Check if service exists and belongs to church
      const [service] = await db
        .select()
        .from(services)
        .where(and(eq(services.id, body.serviceId), eq(services.churchId, churchId)))
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
      .where(and(
        eq(attendance.id, id),
        eq(members.churchId, churchId),
        eq(services.churchId, churchId)
      ))
      .limit(1);

    return NextResponse.json({ attendance: attendanceWithMember });
  } catch (error) {
    return createErrorResponse(error);
  }
}

