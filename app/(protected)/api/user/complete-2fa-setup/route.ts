import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only clear requires2FASetup if user has 2FA enabled (verified they completed setup)
    const userWith2FA = session.user as { twoFactorEnabled?: boolean };
    if (!userWith2FA.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA must be enabled first" },
        { status: 400 }
      );
    }

    await db
      .update(user)
      .set({ requires2FASetup: false })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete 2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to complete 2FA setup" },
      { status: 500 }
    );
  }
}
