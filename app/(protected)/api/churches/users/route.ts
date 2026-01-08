import { NextResponse } from "next/server";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { churchId } = await getAuthContext(request);

    // Get all users for this church
    const churchUsers = await db.query.user.findMany({
      where: eq(user.churchId, churchId),
    });

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
        !churchUsers.find((u) => u.email === inv.email)
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
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;

    console.error("Error fetching church users:", error);
    return NextResponse.json(
      { error: "Failed to fetch church users" },
      { status: 500 }
    );
  }
}

