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
      await db
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(eq(invitations.id, invite.id));
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

