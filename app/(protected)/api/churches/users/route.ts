import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/api-helpers";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations, userChurches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";

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
      const churchInvitations = await db.query.invitations.findMany({
        where: eq(invitations.churchId, churchId),
      });

      const pendingInvitesWithStatus = churchInvitations
        .filter((inv) => !inv.acceptedAt)
        .map((inv) => {
          const isExpired =
            inv.expiresAt && inv.expiresAt.getTime() < Date.now();
          return {
            id: null,
            name: null,
            email: inv.email,
            role: "viewer",
            emailVerified: false,
            createdAt: null,
            status: isExpired ? ("expired" as const) : ("invited" as const),
          };
        });

      return NextResponse.json({
        users: pendingInvitesWithStatus,
      });
    }

    // Get user records for these memberships
    const userIds = memberships.map(m => m.userId);
    const churchUsers = await db.query.user.findMany({
      where: inArray(user.id, userIds),
    });

    // Create a map of userId to role for this church
    const userRoleMap = new Map(memberships.map(m => [m.userId, m.role]));

    // Add role from junction table to each user
    const churchUsersWithRole = churchUsers.map(u => ({
      ...u,
      role: userRoleMap.get(u.id) || "viewer",
    }));

    // Get all invitations for this church
    const churchInvitations = await db.query.invitations.findMany({
      where: eq(invitations.churchId, churchId),
    });

    // Create a map of email to invitation status
    const invitationMap = new Map(
      churchInvitations.map((inv) => [inv.email, inv])
    );

    // Combine users and invitations
    const usersWithStatus = churchUsers.map((u) => {
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
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        status,
      };
    });

    // Also include pending invitations that don't have a user yet
    const pendingInvitations = churchInvitations.filter(
      (inv) =>
        !inv.acceptedAt &&
        !churchUsersWithRole.find((u) => u.email === inv.email)
    );

    const pendingInvitesWithStatus = pendingInvitations.map((inv) => {
      const isExpired =
        inv.expiresAt && inv.expiresAt.getTime() < Date.now();
      return {
        id: null,
        name: null,
        email: inv.email,
        role: "viewer",
        emailVerified: false,
        createdAt: null,
        status: isExpired ? ("expired" as const) : ("invited" as const),
      };
    });

    return NextResponse.json({
      users: [...usersWithStatus, ...pendingInvitesWithStatus],
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

