import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { customerId, priceId, churchId, successUrl, cancelUrl } =
      await request.json();

    if (!customerId || !priceId || !churchId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
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

