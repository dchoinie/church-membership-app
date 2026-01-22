import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, members, services } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { eq, inArray, or } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    await requireSuperAdmin(request);
    const { id: churchId } = await params;

    // Get all member IDs and service IDs for this church
    const churchMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.churchId, churchId));

    const churchServices = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.churchId, churchId));

    const memberIds = churchMembers.map((m) => m.id);
    const serviceIds = churchServices.map((s) => s.id);

    if (memberIds.length === 0 && serviceIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No attendance records to delete",
        deletedCount: 0,
      });
    }

    // Delete all attendance records for members/services of this church
    // Use IN clause for better performance
    const conditions = [];
    if (memberIds.length > 0) {
      conditions.push(inArray(attendance.memberId, memberIds));
    }
    if (serviceIds.length > 0) {
      conditions.push(inArray(attendance.serviceId, serviceIds));
    }

    let deletedCount = 0;
    if (conditions.length > 0) {
      // Count records before deleting
      const recordsToDelete = await db
        .select({ id: attendance.id })
        .from(attendance)
        .where(or(...conditions));
      deletedCount = recordsToDelete.length;
      
      // Then delete
      await db
        .delete(attendance)
        .where(or(...conditions));
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} attendance record${deletedCount !== 1 ? "s" : ""}`,
      deletedCount,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

