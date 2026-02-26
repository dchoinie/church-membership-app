import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { clearUser2FA } from "@/lib/two-factor-reset";
import { send2FAResetEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_PROD_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const withProtocol = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  return withProtocol;
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin(request);

    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true, email: true, name: true },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await clearUser2FA(userRecord.id);

    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/?login=true`;

    await send2FAResetEmail({
      email: userRecord.email,
      resetUrl,
      userName: userRecord.name || undefined,
      churchId: null,
      adminTriggered: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
