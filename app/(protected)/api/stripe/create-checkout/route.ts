import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { getPriceId } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const { customerId, plan, priceId, churchId, successUrl, cancelUrl } =
      await request.json();

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

    const session = await createCheckoutSession(
      customerId,
      resolvedPriceId,
      successUrl,
      cancelUrl,
      { churchId }
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

