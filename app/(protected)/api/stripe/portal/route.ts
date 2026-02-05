import { NextResponse } from "next/server";
import { createCustomerPortalSession } from "@/lib/stripe";
import { checkCsrfToken } from "@/lib/csrf";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/api-helpers";
import { createErrorResponse } from "@/lib/error-handler";

export async function POST(request: Request) {
  try {
    // Check CSRF token
    const csrfError = await checkCsrfToken(request);
    if (csrfError) return csrfError;

    // Require admin role - only admins can manage subscriptions
    const { churchId } = await requireAdmin(request);

    // Get church to find Stripe customer ID
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });

    if (!church || !church.stripeCustomerId) {
      return NextResponse.json(
        { error: "Church or Stripe customer not found" },
        { status: 404 }
      );
    }

    const { returnUrl } = await request.json();

    if (!returnUrl) {
      return NextResponse.json(
        { error: "returnUrl is required" },
        { status: 400 }
      );
    }

    const portalSession = await createCustomerPortalSession(
      church.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return createErrorResponse(error);
  }
}

