import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getSubscription } from "@/lib/stripe";
import { getPlanFromPriceId } from "@/lib/pricing";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Ensure this route runs on Node.js runtime (not Edge) for proper webhook handling
export const runtime = "nodejs";

/**
 * Get the appropriate Stripe webhook secret based on environment
 * Priority: Environment-specific secret > Fallback to STRIPE_WEBHOOK_SECRET
 */
function getWebhookSecret(): string {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Use environment-specific webhook secrets if available
  if (isProduction) {
    if (process.env.STRIPE_PROD_WEBHOOK_SECRET) {
      return process.env.STRIPE_PROD_WEBHOOK_SECRET;
    }
  } else {
    if (process.env.STRIPE_DEV_WEBHOOK_SECRET) {
      return process.env.STRIPE_DEV_WEBHOOK_SECRET;
    }
  }
  
  // Fallback to generic STRIPE_WEBHOOK_SECRET for backward compatibility
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }
  
  throw new Error(
    `Stripe webhook secret is not set. Please set ${
      isProduction ? "STRIPE_PROD_WEBHOOK_SECRET" : "STRIPE_DEV_WEBHOOK_SECRET"
    } or STRIPE_WEBHOOK_SECRET in environment variables`
  );
}

const webhookSecret = getWebhookSecret();

/**
 * Map Stripe subscription status to our database subscription status
 */
function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "past_due" | "canceled" | "unpaid" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      // Map trialing to active since we don't have a trial status
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return stripeStatus === "canceled" ? "canceled" : "unpaid";
    default:
      // For incomplete, incomplete_expired, etc., default to unpaid
      return "unpaid";
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const churchId = session.metadata?.churchId;

        if (!churchId || !subscriptionId) {
          console.error("Missing churchId or subscriptionId in session metadata");
          break;
        }

        // Get subscription details
        const subscription = await getSubscription(subscriptionId);

        // Map subscription status
        const mappedStatus = mapSubscriptionStatus(subscription.status);

        // Extract price ID from subscription to determine plan type
        const priceId = subscription.items.data[0]?.price?.id;
        const planType = priceId ? getPlanFromPriceId(priceId) : null;
        const resolvedPlan = planType || "basic"; // Default to basic if plan cannot be determined

        // Update church with subscription info
        await db
          .update(churches)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: mappedStatus,
            subscriptionPlan: resolvedPlan,
            updatedAt: new Date(),
          })
          .where(eq(churches.id, churchId));

        // Create or update subscription record
        const existingSubscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subscriptionId),
        });

        if (existingSubscription) {
          await db
            .update(subscriptions)
            .set({
              status: mappedStatus,
              plan: resolvedPlan,
              currentPeriodStart: (subscription as any).current_period_start
                ? new Date((subscription as any).current_period_start * 1000)
                : null,
              currentPeriodEnd: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000)
                : null,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        } else {
          await db.insert(subscriptions).values({
            churchId,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            status: mappedStatus,
            plan: resolvedPlan,
            currentPeriodStart: (subscription as any).current_period_start
              ? new Date((subscription as any).current_period_start * 1000)
              : null,
            currentPeriodEnd: (subscription as any).current_period_end
              ? new Date((subscription as any).current_period_end * 1000)
              : null,
          });
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find church by customer ID
        const church = await db.query.churches.findFirst({
          where: eq(churches.stripeCustomerId, customerId),
        });

        if (!church) {
          console.error("Church not found for customer:", customerId);
          break;
        }

        // Map subscription status
        const mappedStatus = mapSubscriptionStatus(subscription.status);

        // Extract price ID from subscription to determine plan type
        const priceId = subscription.items.data[0]?.price?.id;
        const planType = priceId ? getPlanFromPriceId(priceId) : null;
        const resolvedPlan = planType || church.subscriptionPlan; // Keep current plan if cannot be determined

        // Update church subscription status and plan
        await db
          .update(churches)
          .set({
            subscriptionStatus: mappedStatus,
            subscriptionPlan: resolvedPlan,
            updatedAt: new Date(),
          })
          .where(eq(churches.id, church.id));

        // Update subscription record
        const existingSubscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subscription.id),
        });

        if (existingSubscription) {
          await db
            .update(subscriptions)
            .set({
              status: mappedStatus,
              plan: resolvedPlan,
              currentPeriodStart: (subscription as any).current_period_start
                ? new Date((subscription as any).current_period_start * 1000)
                : null,
              currentPeriodEnd: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000)
                : null,
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find church by customer ID
        const church = await db.query.churches.findFirst({
          where: eq(churches.stripeCustomerId, customerId),
        });

        if (!church) {
          console.error("Church not found for customer:", customerId);
          break;
        }

        // Update church subscription status
        await db
          .update(churches)
          .set({
            subscriptionStatus: "canceled",
            updatedAt: new Date(),
          })
          .where(eq(churches.id, church.id));

        // Update subscription record
        const existingSubscription = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, subscription.id),
        });

        if (existingSubscription) {
          await db
            .update(subscriptions)
            .set({
              status: "canceled",
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

