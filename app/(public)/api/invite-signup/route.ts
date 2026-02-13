import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { churches, invitations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { user } from "@/auth-schema";
import { addUserToChurch } from "@/lib/tenant-db";
import { sendSuperAdminInviteJoinAlert } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password || !name || !inviteCode) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const invite = await db.query.invitations.findFirst({
      where: eq(invitations.code, inviteCode),
    });

    const isExpired =
      invite?.expiresAt && invite.expiresAt.getTime() < Date.now();

    if (
      !invite ||
      invite.email !== email ||
      invite.acceptedAt ||
      isExpired
    ) {
      return NextResponse.json(
        { error: "Invite is invalid or expired." },
        { status: 400 },
      );
    }

    const response = await auth.api.signUpEmail({
      body: { email, password, name },
      headers: request.headers,
      asResponse: true,
    });

    if (response.ok) {
      // Clone the response to read the body without consuming it
      const clonedResponse = response.clone();
      const signupData = await clonedResponse.json();
      const userId = signupData.user?.id;

      if (userId && invite.churchId) {
        // Add user to church via junction table with default role (viewer)
        // Role can be updated later by admin via the manage-admin-access page
        await addUserToChurch(userId, invite.churchId, "viewer");
      }

      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      // For invited users, automatically mark email as verified
      // They've already been invited via email, so no need for separate verification
      if (userId) {
        await db
          .update(user)
          .set({ emailVerified: true })
          .where(eq(user.id, userId));
      }

      // Super admin alert for invite join (fire-and-forget)
      if (userId && invite.churchId) {
        const church = await db.query.churches.findFirst({
          where: eq(churches.id, invite.churchId),
          columns: { name: true },
        });
        sendSuperAdminInviteJoinAlert({
          userName: name,
          userEmail: email,
          churchName: church?.name ?? "Unknown Church",
          churchId: invite.churchId,
        }).catch((err) => console.error("Super admin invite join alert error:", err));
      }

      // Return the original auth response which includes the session cookie
      // The user will be signed in and can proceed directly to dashboard
      return response;
    }

    return response;
  } catch (error) {
    console.error("Invite signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup." },
      { status: 500 },
    );
  }
}

