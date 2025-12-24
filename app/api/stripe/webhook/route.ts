import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { churches, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
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
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update church with subscription info
        await db
          .update(churches)
          .set({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: subscription.status === "trialing" ? "trialing" : "active",
            trialEndsAt: subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : null,
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
              status: subscription.status === "trialing" ? "trialing" : "active",
              currentPeriodStart: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000)
                : null,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSubscription.id));
        } else {
          await db.insert(subscriptions).values({
            churchId,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: customerId,
            status: subscription.status === "trialing" ? "trialing" : "active",
            plan: "basic", // Default plan, update based on price ID if needed
            currentPeriodStart: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000)
              : null,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
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

        // Update church subscription status
        await db
          .update(churches)
          .set({
            subscriptionStatus:
              subscription.status === "trialing"
                ? "trialing"
                : subscription.status === "active"
                ? "active"
                : subscription.status === "past_due"
                ? "past_due"
                : subscription.status === "canceled" || subscription.status === "unpaid"
                ? "canceled"
                : "unpaid",
            trialEndsAt: subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : null,
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
              status:
                subscription.status === "trialing"
                  ? "trialing"
                  : subscription.status === "active"
                  ? "active"
                  : subscription.status === "past_due"
                  ? "past_due"
                  : subscription.status === "canceled" || subscription.status === "unpaid"
                  ? "canceled"
                  : "unpaid",
              currentPeriodStart: subscription.current_period_start
                ? new Date(subscription.current_period_start * 1000)
                : null,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
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

