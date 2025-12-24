import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invitations } from "@/db/schema";
import { auth } from "@/lib/auth";

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
      // Mark invitation as accepted
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));

      // Send verification email
      try {
        await auth.api.sendVerificationEmail({
          body: { email },
          headers: request.headers,
        });
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        // Don't fail the signup if email fails - user can resend from verify-email page
      }

      // Return the auth response which includes the session cookie
      // The user will be signed in but redirected to verify-email page by auth-layout
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

