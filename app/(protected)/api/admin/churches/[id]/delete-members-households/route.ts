import { NextResponse } from "next/server";
import { db } from "@/db";
import { members, household } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { eq } from "drizzle-orm";

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

    // Delete all members first (this will cascade delete giving and attendance)
    const deletedMembers = await db
      .delete(members)
      .where(eq(members.churchId, churchId));

    const memberCount = deletedMembers.rowCount || 0;

    // Delete all households for this church
    const deletedHouseholds = await db
      .delete(household)
      .where(eq(household.churchId, churchId));

    const householdCount = deletedHouseholds.rowCount || 0;

    return NextResponse.json({
      success: true,
      message: `Deleted ${memberCount} member${memberCount !== 1 ? "s" : ""} and ${householdCount} household${householdCount !== 1 ? "s" : ""}`,
      deletedMembers: memberCount,
      deletedHouseholds: householdCount,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

