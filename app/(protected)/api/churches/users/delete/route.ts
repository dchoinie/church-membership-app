import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations, userChurches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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

    // Find the user by email
    const userToDelete = await db.query.user.findFirst({
      where: eq(user.email, sanitizedEmail),
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify user belongs to this church via junction table
    const membership = await db.query.userChurches.findFirst({
      where: and(
        eq(userChurches.userId, userToDelete.id),
        eq(userChurches.churchId, churchId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User does not belong to this church" },
        { status: 404 }
      );
    }

    // Check if this is the last admin user for this church
    const adminMemberships = await db.query.userChurches.findMany({
      where: and(
        eq(userChurches.churchId, churchId),
        eq(userChurches.role, "admin")
      ),
    });

    const adminUserIds = adminMemberships.map(m => m.userId);
    const adminUsers = await db.query.user.findMany({
      where: inArray(user.id, adminUserIds),
      columns: {
        isSuperAdmin: true,
      },
    });

    const nonSuperAdminAdmins = adminUsers.filter(u => !u.isSuperAdmin);

    if (
      nonSuperAdminAdmins.length === 1 &&
      membership.role === "admin" &&
      !userToDelete.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Cannot remove the last admin user for this church" },
        { status: 400 }
      );
    }

    // Delete invitations associated with this email and church
    await db
      .delete(invitations)
      .where(and(eq(invitations.email, sanitizedEmail), eq(invitations.churchId, churchId)));

    // Remove user from this church (don't delete the user entirely - they might belong to other churches)
    await db
      .delete(userChurches)
      .where(and(
        eq(userChurches.userId, userToDelete.id),
        eq(userChurches.churchId, churchId)
      ));

    return NextResponse.json({
      success: true,
      message: `User access removed for ${sanitizedEmail}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

