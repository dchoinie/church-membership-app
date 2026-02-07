import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { db } from "@/db";
import { givingStatements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { canManageGivingStatements } from "@/lib/permissions-server";
import { checkCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/giving-statements/[id]
 * Deletes a giving statement
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const churchId = await getTenantFromRequest(request);

    if (!churchId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    const hasPermission = await canManageGivingStatements(userId, churchId);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to delete giving statements" },
        { status: 403 }
      );
    }

    const { id: statementId } = await params;

    // Check if statement exists and belongs to church
    const [statement] = await db
      .select()
      .from(givingStatements)
      .where(
        and(
          eq(givingStatements.id, statementId),
          eq(givingStatements.churchId, churchId)
        )
      )
      .limit(1);

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Delete the statement
    await db
      .delete(givingStatements)
      .where(eq(givingStatements.id, statementId));

    return NextResponse.json({
      success: true,
      message: "Statement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting giving statement:", error);
    return NextResponse.json(
      {
        error: "Failed to delete giving statement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
