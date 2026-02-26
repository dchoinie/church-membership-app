import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { create2FAResetToken } from "@/lib/two-factor-reset";
import { send2FAResetEmail } from "@/lib/email";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_PROD_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const withProtocol = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  return withProtocol;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const userRecord = await db.query.user.findFirst({
      where: eq(user.email, trimmedEmail),
      columns: { id: true, name: true, email: true, twoFactorEnabled: true },
    });

    if (!userRecord || !userRecord.twoFactorEnabled) {
      return NextResponse.json({ success: true });
    }

    const token = await create2FAResetToken(userRecord.id);
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-2fa?token=${token}`;

    await send2FAResetEmail({
      email: userRecord.email,
      resetUrl,
      userName: userRecord.name || undefined,
      churchId: null,
      adminTriggered: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA reset request error:", error);
    return NextResponse.json(
      { error: "Failed to send 2FA reset email" },
      { status: 500 }
    );
  }
}
