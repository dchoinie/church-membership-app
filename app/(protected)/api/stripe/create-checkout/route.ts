import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { getPriceId } from "@/lib/pricing";
import { checkCsrfToken } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

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
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

