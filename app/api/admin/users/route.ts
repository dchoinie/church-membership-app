import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";

export async function GET() {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users
    const users = await db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
    });

    // Get all invitations (pending and accepted)
    const allInvitations = await db.query.invitations.findMany();

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
        status: isExpired ? ("expired" as const) : ("invited" as const),
        createdAt: inv.expiresAt || null,
        emailVerified: false,
      };
    });

    return NextResponse.json({
      users: [...usersWithStatus, ...pendingInvitesWithStatus],
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

