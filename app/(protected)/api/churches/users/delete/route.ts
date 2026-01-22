import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeEmail } from "@/lib/sanitize";

export async function DELETE(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId, user: currentUser } = await requireAdmin(request);
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Prevent deleting yourself
    if (currentUser.email === sanitizedEmail) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Find the user by email and church ID
    const userToDelete = await db.query.user.findFirst({
      where: and(eq(user.email, sanitizedEmail), eq(user.churchId, churchId)),
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if this is the last admin user for this church
    const allChurchUsers = await db.query.user.findMany({
      where: eq(user.churchId, churchId),
    });

    const adminUsers = allChurchUsers.filter(
      (u) => u.role === "admin" || u.isSuperAdmin
    );

    if (
      adminUsers.length === 1 &&
      (userToDelete.role === "admin" || userToDelete.isSuperAdmin)
    ) {
      return NextResponse.json(
        { error: "Cannot delete the last admin user for this church" },
        { status: 400 }
      );
    }

    // Delete invitations associated with this email and church
    await db
      .delete(invitations)
      .where(and(eq(invitations.email, sanitizedEmail), eq(invitations.churchId, churchId)));

    // Delete the user (this will cascade delete sessions and accounts)
    await db.delete(user).where(eq(user.id, userToDelete.id));

    return NextResponse.json({
      success: true,
      message: `User access removed for ${sanitizedEmail}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

