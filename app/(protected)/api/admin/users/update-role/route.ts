import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/auth-schema";
import { userChurches } from "@/db/schema";
import { requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeEmail } from "@/lib/sanitize";
import { checkAdminLimit } from "@/lib/admin-limits";
import { isRoleAvailableForPlan, getAvailableRoles } from "@/lib/permissions";
import { churches } from "@/db/schema";

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

    // Get church subscription plan
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
      columns: {
        subscriptionPlan: true,
      },
    });

    const subscriptionPlan = (church?.subscriptionPlan || "basic") as "basic" | "premium";

    // Validate role is available for the subscription plan
    if (!isRoleAvailableForPlan(role, subscriptionPlan)) {
      const availableRoles = getAvailableRoles(subscriptionPlan);
      return NextResponse.json(
        { 
          error: `Role '${role}' is not available for ${subscriptionPlan} plan. Available roles: ${availableRoles.join(", ")}` 
        },
        { status: 400 },
      );
    }
    
    // TypeScript now knows role is valid after validation
    const validRole = role as "admin" | "viewer" | "members_editor" | "giving_editor" | "attendance_editor" | "reports_viewer" | "analytics_viewer";

    // Only admins can update roles
    if (currentUser.role !== "admin" && !currentUser.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only admins can update user roles" },
        { status: 403 },
      );
    }

    // Sanitize email
    const sanitizedEmail = sanitizeEmail(email);

    // Find the user by email
    const userToUpdate = await db.query.user.findFirst({
      where: eq(user.email, sanitizedEmail),
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // Verify user belongs to this church via junction table
    const membership = await db.query.userChurches.findFirst({
      where: and(
        eq(userChurches.userId, userToUpdate.id),
        eq(userChurches.churchId, churchId)
      ),
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User does not belong to this church" },
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
    if (membership.role === "admin" && validRole === "viewer") {
      const adminMemberships = await db.query.userChurches.findMany({
        where: and(
          eq(userChurches.churchId, churchId),
          eq(userChurches.role, "admin")
        ),
      });

      const adminUserIds = adminMemberships.map(m => m.userId);
      const { inArray } = await import("drizzle-orm");
      const adminUsers = await db.query.user.findMany({
        where: inArray(user.id, adminUserIds),
        columns: {
          isSuperAdmin: true,
        },
      });

      const nonSuperAdminAdmins = adminUsers.filter(u => !u.isSuperAdmin);

      if (nonSuperAdminAdmins.length === 1 && !userToUpdate.isSuperAdmin) {
        return NextResponse.json(
          { error: "Cannot change the last admin user to viewer" },
          { status: 400 },
        );
      }
    }

    // Check admin limit if updating role to admin
    if (membership.role !== "admin" && validRole === "admin") {
      const adminLimitCheck = await checkAdminLimit(churchId, 1);
      if (!adminLimitCheck.allowed) {
        const upgradeMessage = adminLimitCheck.plan === "basic"
          ? "Upgrade to Premium plan for up to 10 admin users."
          : "Admin user limit reached for your plan.";
        return NextResponse.json(
          { 
            error: `Admin user limit reached (${adminLimitCheck.currentCount}/${adminLimitCheck.limit}). ${upgradeMessage}` 
          },
          { status: 403 },
        );
      }
    }

    // Update the user's role for this church in the junction table
    await db
      .update(userChurches)
      .set({ role: validRole, updatedAt: new Date() })
      .where(and(
        eq(userChurches.userId, userToUpdate.id),
        eq(userChurches.churchId, churchId)
      ));

    return NextResponse.json({
      success: true,
      message: `User role updated to ${validRole}`,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

