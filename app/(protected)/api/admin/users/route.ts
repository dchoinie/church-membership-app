import { NextResponse } from "next/server";
import { desc, eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations, churches, userChurches } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { checkAdminLimit, getAdminLimit } from "@/lib/admin-limits";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get all user-church memberships for this church
    const memberships = await db.query.userChurches.findMany({
      where: eq(userChurches.churchId, churchId),
      columns: {
        userId: true,
        role: true,
      },
    });

    if (memberships.length === 0) {
      // No users for this church yet
      const allInvitations = await db.query.invitations.findMany({
        where: eq(invitations.churchId, churchId),
      });
      
      const pendingInvitesWithStatus = allInvitations
        .filter((inv) => !inv.acceptedAt)
        .map((inv) => {
          const isExpired =
            inv.expiresAt && inv.expiresAt.getTime() < Date.now();
          return {
            id: null,
            name: null,
            email: inv.email,
            role: "viewer" as const,
            status: isExpired ? ("expired" as const) : ("invited" as const),
            createdAt: inv.expiresAt || null,
            emailVerified: false,
          };
        });

      const church = await db.query.churches.findFirst({
        where: eq(churches.id, churchId),
        columns: {
          subscriptionPlan: true,
        },
      });

      const plan = church?.subscriptionPlan || "basic";
      const adminLimit = getAdminLimit(plan as "basic" | "premium" | "free");

      return NextResponse.json({
        users: pendingInvitesWithStatus,
        adminLimit,
        adminCount: 0,
      });
    }

    // Get user records for these memberships
    const userIds = memberships.map(m => m.userId);
    const users = await db.query.user.findMany({
      where: inArray(user.id, userIds),
      orderBy: [desc(user.createdAt)],
    });

    // Create a map of userId to role for this church
    const userRoleMap = new Map(memberships.map(m => [m.userId, m.role]));

    // Add role from junction table to each user
    const usersWithChurchRole = users.map(u => ({
      ...u,
      role: userRoleMap.get(u.id) || "viewer",
    }));

    // Get all invitations for this church (pending and accepted)
    const allInvitations = await db.query.invitations.findMany({
      where: eq(invitations.churchId, churchId),
    });

    // Create a map of email to invitation status
    const invitationMap = new Map(
      allInvitations.map((inv) => [inv.email, inv]),
    );

    // Combine users and invitations to determine status
    const usersWithStatus = usersWithChurchRole.map((u) => {
      const invite = invitationMap.get(u.email);
      let status: "active" | "invited" = "active";

      // If there's an invitation that hasn't been accepted, status is "invited"
      if (invite && !invite.acceptedAt) {
        const isExpired =
          invite.expiresAt && invite.expiresAt.getTime() < Date.now();
        if (!isExpired) {
          status = "invited";
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status,
        createdAt: u.createdAt,
        emailVerified: u.emailVerified,
      };
    });

    // Also include pending invitations that don't have a user yet
    const pendingInvitations = allInvitations.filter(
      (inv) => !inv.acceptedAt && !users.find((u) => u.email === inv.email),
    );

    const pendingInvitesWithStatus = pendingInvitations.map((inv) => {
      const isExpired =
        inv.expiresAt && inv.expiresAt.getTime() < Date.now();
      return {
        id: null,
        name: null,
        email: inv.email,
        role: "viewer" as const, // Default role for pending invitations
        status: isExpired ? ("expired" as const) : ("invited" as const),
        createdAt: inv.expiresAt || null,
        emailVerified: false,
      };
    });

    // Get admin limit info for the UI
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
      columns: {
        subscriptionPlan: true,
      },
    });

    const plan = church?.subscriptionPlan || "basic";
    const adminLimit = getAdminLimit(plan as "basic" | "premium" | "free");
    
    // Count current admin users (excluding super admins)
    // Use memberships which already have the role for this church
    const adminMemberships = memberships.filter(m => m.role === "admin");
    const adminUserIds = adminMemberships.map(m => m.userId);
    const adminUsers = await db.query.user.findMany({
      where: inArray(user.id, adminUserIds),
      columns: {
        isSuperAdmin: true,
      },
    });

    const adminCount = adminUsers.filter(u => !u.isSuperAdmin).length;

    return NextResponse.json({
      users: [...usersWithStatus, ...pendingInvitesWithStatus],
      adminLimit,
      adminCount,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

