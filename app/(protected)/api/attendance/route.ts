import { NextResponse } from "next/server";
import { eq, desc, count, and } from "drizzle-orm";

import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const serviceIdFilter = searchParams.get("serviceId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.max(1, Math.min(100, pageSize)); // Max 100 per page
    const offset = (validPage - 1) * validPageSize;

    // Build where conditions (always filter by churchId via member/service relationships)
    const whereConditions = [
      eq(members.churchId, churchId),
      eq(services.churchId, churchId),
    ];
    if (serviceIdFilter) {
      whereConditions.push(eq(attendance.serviceId, serviceIdFilter));
    }

    const whereCondition = and(...whereConditions);

    // Get total count (filtered by churchId)
    const [totalResult] = await db
      .select({ count: count() })
      .from(attendance)
      .innerJoin(members, eq(attendance.memberId, members.id))
      .innerJoin(services, eq(attendance.serviceId, services.id))
      .where(whereCondition);
    const total = totalResult.count;
    const totalPages = Math.ceil(total / validPageSize);

    // Get paginated attendance records with member and service info (filtered by churchId)
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
      .where(whereCondition)
      .orderBy(desc(services.serviceDate), desc(attendance.createdAt))
      .limit(validPageSize)
      .offset(offset);

    return NextResponse.json({
      attendance: attendanceRecords,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error fetching attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);
    const body = await request.json();

    // Validate required fields
    if (!body.serviceId || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: "Service ID and records array are required" },
        { status: 400 },
      );
    }

    // Filter to only process records for members who attended
    interface AttendanceRecord {
      memberId: string;
      attended: boolean;
      tookCommunion: boolean;
    }
    const attendedRecords = (body.records as AttendanceRecord[]).filter((record) => record.attended === true);

    // If no attendees, return early
    if (attendedRecords.length === 0) {
      return NextResponse.json({
        success: 0,
        failed: 0,
        errors: [],
        message: "No attendance records to create (only members who attended are recorded)",
      });
    }

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

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all existing attendance records for this service to handle deletions
    const existingRecords = await db
      .select()
      .from(attendance)
      .where(eq(attendance.serviceId, body.serviceId));

    const processedMemberIds = new Set<string>();

    // Process each attended record
    for (let i = 0; i < attendedRecords.length; i++) {
      try {
        const record = attendedRecords[i];
        processedMemberIds.add(record.memberId);

        // Validate required fields
        if (!record.memberId || typeof record.tookCommunion !== "boolean") {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Missing required fields (memberId, tookCommunion)`,
          );
          continue;
        }

        // Since we're only processing attended records, attended is always true
        // Validate: Cannot take communion without attending (shouldn't happen, but safety check)
        if (record.tookCommunion && !record.attended) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Cannot take communion without attending`,
          );
          continue;
        }

        // Check if member exists and belongs to church
        const [member] = await db
          .select()
          .from(members)
          .where(and(eq(members.id, record.memberId), eq(members.churchId, churchId)))
          .limit(1);

        if (!member) {
          results.failed++;
          results.errors.push(
            `Row ${i + 1}: Member not found`,
          );
          continue;
        }

        // Check if attendance record already exists for this member and service
        const [existingAttendance] = await db
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.memberId, record.memberId),
              eq(attendance.serviceId, body.serviceId),
            ),
          )
          .limit(1);

        if (existingAttendance) {
          // Update existing record (attended is always true at this point)
          await db
            .update(attendance)
            .set({
              attended: true,
              tookCommunion: record.tookCommunion,
              updatedAt: new Date(),
            })
            .where(eq(attendance.id, existingAttendance.id));
          results.success++;
        } else {
          // Insert new record (only for members who attended)
          await db
            .insert(attendance)
            .values({
              memberId: record.memberId,
              serviceId: body.serviceId,
              attended: true,
              tookCommunion: record.tookCommunion,
            });
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Delete attendance records for members who were previously marked as attended
    // but are no longer in the attended list (if updating existing attendance)
    const recordsToDelete = existingRecords.filter(
      (existing) => !processedMemberIds.has(existing.memberId),
    );

    for (const recordToDelete of recordsToDelete) {
      try {
        await db.delete(attendance).where(eq(attendance.id, recordToDelete.id));
      } catch (error) {
        console.error("Error deleting attendance record:", error);
        // Don't fail the whole request if deletion fails
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;
    
    console.error("Error batch creating/updating attendance records:", error);
    return NextResponse.json(
      { error: "Failed to batch create/update attendance records" },
      { status: 500 },
    );
  }
}

