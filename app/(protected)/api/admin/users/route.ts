import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations } from "@/db/schema";
import { getAuthContext } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get all users for this church
    const users = await db.query.user.findMany({
      where: eq(user.churchId, churchId),
      orderBy: [desc(user.createdAt)],
    });

    // Get all invitations for this church (pending and accepted)
    const allInvitations = await db.query.invitations.findMany({
      where: eq(invitations.churchId, churchId),
    });

    // Create a map of email to invitation status
    const invitationMap = new Map(
      allInvitations.map((inv) => [inv.email, inv]),
    );

    // Combine users and invitations to determine status
    const usersWithStatus = users.map((u) => {
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

    return NextResponse.json({
      users: [...usersWithStatus, ...pendingInvitesWithStatus],
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

