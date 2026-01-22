import { NextResponse } from "next/server";
import { db } from "@/db";
import { giving, members } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { eq, inArray } from "drizzle-orm";

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

    // Get all member IDs for this church
    const churchMembers = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.churchId, churchId));

    const memberIds = churchMembers.map((m) => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No giving records to delete",
        deletedCount: 0,
      });
    }

    // Delete all giving records for these members using IN clause
    const deleted = await db
      .delete(giving)
      .where(inArray(giving.memberId, memberIds));

    const deletedCount = deleted.rowCount || 0;

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} giving record${deletedCount !== 1 ? "s" : ""}`,
      deletedCount,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

