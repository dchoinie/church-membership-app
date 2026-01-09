import { NextResponse } from "next/server";
import { getAuthContext, handleAuthError } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { churchId, user } = await getAuthContext(request);
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 400 }
      );
    }

    // Get the current church
    const currentChurch = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!currentChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Only allow activation if plan is free and subscription is not already active
    if (currentChurch.subscriptionPlan !== "free") {
      return NextResponse.json(
        { error: "This endpoint is only for activating free plans" },
        { status: 400 }
      );
    }

    if (currentChurch.subscriptionStatus === "active") {
      return NextResponse.json(
        { error: "Subscription is already active" },
        { status: 400 }
      );
    }

    // Activate the free plan by setting subscription status to active
    const [updatedChurch] = await db
      .update(churches)
      .set({
        subscriptionStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(churches.id, churchId))
      .returning();

    if (!updatedChurch) {
      return NextResponse.json(
        { error: "Failed to activate subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      church: updatedChurch,
      message: "Free plan activated successfully"
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError.status !== 500) return authError;

    console.error("Error activating free plan:", error);
    return NextResponse.json(
      { error: "Failed to activate free plan" },
      { status: 500 }
    );
  }
}

