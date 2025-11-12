import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { invitations } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 },
      );
    }

    const invite = await db.query.invitations.findFirst({
      where: eq(invitations.code, code),
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 },
      );
    }

    const isExpired =
      invite.expiresAt && invite.expiresAt.getTime() < Date.now();

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    if (isExpired) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 },
    );
  }
}

