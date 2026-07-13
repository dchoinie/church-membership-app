import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { requireSuperAdmin } from "@/lib/auth-helpers";
import { createErrorResponse } from "@/lib/error-handler";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    await requireSuperAdmin(request);

    const { userId, exempt } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (typeof exempt !== "boolean") {
      return NextResponse.json(
        { error: "exempt must be a boolean" },
        { status: 400 }
      );
    }

    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true },
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await db
      .update(user)
      .set({ twoFactorExempt: exempt })
      .where(eq(user.id, userId));

    return NextResponse.json({ success: true, twoFactorExempt: exempt });
  } catch (error) {
    return createErrorResponse(error);
  }
}
