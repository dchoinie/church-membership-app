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

    // Count members before deleting (this will cascade delete giving and attendance)
    const membersToDelete = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.churchId, churchId));
    const memberCount = membersToDelete.length;
    
    // Delete all members
    await db
      .delete(members)
      .where(eq(members.churchId, churchId));

    // Count households before deleting
    const householdsToDelete = await db
      .select({ id: household.id })
      .from(household)
      .where(eq(household.churchId, churchId));
    const householdCount = householdsToDelete.length;
    
    // Delete all households for this church
    await db
      .delete(household)
      .where(eq(household.churchId, churchId));

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

