import { NextResponse } from "next/server";
import { getAuthContext, requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";
import { checkCsrfToken } from "@/lib/csrf";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";

export async function PUT(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role
    const { churchId, user } = await requireAdmin(request);
    
    if (!churchId) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get the current church to check subscription status
    const currentChurch = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!currentChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    // Only allow subscription plan update if subscription is not active
    // (i.e., still in setup/trialing phase)
    const canUpdatePlan = 
      currentChurch.subscriptionStatus === "trialing" || 
      currentChurch.subscriptionStatus === "unpaid" ||
      !currentChurch.stripeSubscriptionId;

    const updateData: {
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      denomination?: string | null;
      phone?: string | null;
      logoUrl?: string | null;
      subscriptionPlan?: "basic" | "premium";
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.address !== undefined) {
      updateData.address = body.address ? sanitizeText(body.address) : null;
    }
    if (body.city !== undefined) {
      updateData.city = body.city ? sanitizeText(body.city) : null;
    }
    if (body.state !== undefined) {
      updateData.state = body.state ? sanitizeText(body.state) : null;
    }
    if (body.zip !== undefined) {
      updateData.zip = body.zip ? sanitizeText(body.zip) : null;
    }
    if (body.denomination !== undefined) {
      updateData.denomination = body.denomination ? sanitizeText(body.denomination) : null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? sanitizeText(body.phone) : null;
    }
    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl ? sanitizeUrl(body.logoUrl) : null;
    }
    if (body.subscriptionPlan !== undefined && canUpdatePlan) {
      // Validate subscription plan
      if (!["basic", "premium"].includes(body.subscriptionPlan)) {
        return NextResponse.json(
          { error: "Invalid subscription plan" },
          { status: 400 }
        );
      }
      updateData.subscriptionPlan = body.subscriptionPlan;
    }

    const [updatedChurch] = await db
      .update(churches)
      .set(updateData)
      .where(eq(churches.id, churchId))
      .returning();

    if (!updatedChurch) {
      return NextResponse.json(
        { error: "Church not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ church: updatedChurch });
  } catch (error) {
    return createErrorResponse(error);
  }
}

