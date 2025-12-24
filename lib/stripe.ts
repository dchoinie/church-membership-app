import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Subscription plan definitions (placeholder pricing)
export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    priceId: process.env.STRIPE_PRICE_ID_FREE || "",
    price: 0,
    features: ["Up to 50 members", "Basic reports", "Email support"],
  },
  basic: {
    name: "Basic",
    priceId: process.env.STRIPE_PRICE_ID_BASIC || "",
    price: 29, // $29/month placeholder
    features: ["Up to 500 members", "Advanced reports", "Priority support"],
  },
  premium: {
    name: "Premium",
    priceId: process.env.STRIPE_PRICE_ID_PREMIUM || "",
    price: 99, // $99/month placeholder
    features: ["Unlimited members", "All reports", "Dedicated support"],
  },
} as const;

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
      metadata,
    },
  });
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/**
 * Update subscription plan
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "always_invoice",
  });
}

/**
 * Create customer portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

