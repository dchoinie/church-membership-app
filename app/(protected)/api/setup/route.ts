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
    // (i.e., still in setup/unpaid phase)
    const canUpdatePlan = 
      currentChurch.subscriptionStatus === "unpaid" ||
      !currentChurch.stripeSubscriptionId;

    const updateData: {
      address?: string;
      city?: string;
      state?: string;
      zip?: string;
      denomination?: string;
      phone?: string;
      logoUrl?: string;
      subscriptionPlan?: "basic" | "premium";
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.address !== undefined) {
      updateData.address = body.address ? sanitizeText(body.address) : undefined;
    }
    if (body.city !== undefined) {
      updateData.city = body.city ? sanitizeText(body.city) : undefined;
    }
    if (body.state !== undefined) {
      updateData.state = body.state ? sanitizeText(body.state) : undefined;
    }
    if (body.zip !== undefined) {
      updateData.zip = body.zip ? sanitizeText(body.zip) : undefined;
    }
    if (body.denomination !== undefined) {
      updateData.denomination = body.denomination ? sanitizeText(body.denomination) : undefined;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone ? sanitizeText(body.phone) : undefined;
    }
    if (body.logoUrl !== undefined) {
      updateData.logoUrl = body.logoUrl ? sanitizeUrl(body.logoUrl) : undefined;
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

