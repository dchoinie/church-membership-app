import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { getPriceId } from "@/lib/pricing";
import { checkCsrfToken } from "@/lib/csrf";
import { requireAdmin } from "@/lib/api-helpers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createErrorResponse } from "@/lib/error-handler";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin - only church admins can create checkout sessions
    const { churchId: userChurchId } = await requireAdmin(request);

    const { 
      customerId, 
      plan, 
      priceId, 
      churchId, 
      successUrl, 
      cancelUrl,
      allowPromotionCodes,
      couponCode 
    } = await request.json();

    // Support both plan type (preferred) and priceId (for backward compatibility)
    let resolvedPriceId: string;
    if (plan && (plan === "basic" || plan === "premium")) {
      resolvedPriceId = getPriceId(plan);
    } else if (priceId) {
      resolvedPriceId = priceId;
    } else {
      return NextResponse.json(
        { error: "Missing required fields: plan or priceId" },
        { status: 400 }
      );
    }

    if (!customerId || !churchId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Security: Verify churchId matches authenticated user's church
    if (churchId !== userChurchId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Security: Verify customerId matches church's Stripe customer (prevents subscription theft)
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
      columns: { stripeCustomerId: true },
    });

    if (!church?.stripeCustomerId || church.stripeCustomerId !== customerId) {
      return NextResponse.json(
        { error: "Invalid church or customer" },
        { status: 403 }
      );
    }

    // Prepare checkout options
    const checkoutOptions: {
      allowPromotionCodes?: boolean;
      discounts?: Array<{ coupon: string }>;
    } = {};

    // Enable promotion code field if requested
    if (allowPromotionCodes === true) {
      checkoutOptions.allowPromotionCodes = true;
    }

    // Apply specific coupon code if provided
    if (couponCode && typeof couponCode === "string") {
      checkoutOptions.discounts = [{ coupon: couponCode }];
    }

    const session = await createCheckoutSession(
      customerId,
      resolvedPriceId,
      successUrl,
      cancelUrl,
      { churchId },
      Object.keys(checkoutOptions).length > 0 ? checkoutOptions : undefined
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return createErrorResponse(error);
  }
}

