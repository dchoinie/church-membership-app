import { NextResponse } from "next/server";
import { consume2FAResetToken } from "@/lib/two-factor-reset";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing token" },
        { status: 400 }
      );
    }

    const userId = await consume2FAResetToken(token);

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired token. Please request a new 2FA reset." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA reset confirm error:", error);
    return NextResponse.json(
      { error: "Failed to reset 2FA" },
      { status: 500 }
    );
  }
}
