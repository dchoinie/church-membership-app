import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/auth-schema";
import { requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeEmail } from "@/lib/sanitize";

export async function PUT(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId, user: currentUser } = await requireAdmin(request);
    const { email, role } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 },
      );
    }

    // Validate role
    const validRoles = ["admin", "viewer"] as const;
    
    if (!validRoles.includes(role as typeof validRoles[number])) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'viewer'" },
        { status: 400 },
      );
    }
    
    // TypeScript now knows role is one of the valid roles after validation
    // Assert to the full enum type that Drizzle expects: "super_admin" | "admin" | "viewer"
    const validRole = role as "super_admin" | "admin" | "viewer";

    // Only admins can update roles
    if (currentUser.role !== "admin" && !currentUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only admins can update user roles" },
        { status: 403 },
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Find the user by email and verify they belong to church
    const userToUpdate = await db.query.user.findFirst({
      where: and(eq(user.email, sanitizedEmail), eq(user.churchId, churchId)),
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Prevent updating your own role
    if (currentUser.email === sanitizedEmail) {
      return NextResponse.json(
        { error: "You cannot update your own role" },
        { status: 400 },
      );
    }

    // Check if this is the last admin user for this church and we're trying to change them to viewer
    if (userToUpdate.role === "admin" && validRole === "viewer") {
      const allChurchUsers = await db.query.user.findMany({
        where: eq(user.churchId, churchId),
      });

      const adminUsers = allChurchUsers.filter(
        (u) => u.role === "admin" || u.role === "super_admin"
      );

      if (adminUsers.length === 1) {
        return NextResponse.json(
          { error: "Cannot change the last admin user to viewer" },
          { status: 400 },
        );
      }
    }

    // Update the user's role
    await db
      .update(user)
      .set({ role: validRole, updatedAt: new Date() })
      .where(eq(user.id, userToUpdate.id));

    return NextResponse.json({
      success: true,
      message: `User role updated to ${validRole}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

