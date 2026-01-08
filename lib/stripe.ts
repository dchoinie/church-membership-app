import Stripe from "stripe";

/**
 * Get the appropriate Stripe secret key based on environment
 * Priority: Environment-specific key > Fallback to STRIPE_SECRET_KEY
 */
function getStripeSecretKey(): string {
  // Only access Stripe on the server side
  if (typeof window !== "undefined") {
    throw new Error("Stripe secret key cannot be accessed on the client side");
  }

  const isProduction = process.env.NODE_ENV === "production";
  
  // Debug: Log available env vars (only in development)
  if (process.env.NODE_ENV !== "production") {
    console.log("Checking Stripe keys - NODE_ENV:", process.env.NODE_ENV);
    console.log("STRIPE_DEV_SECRET_KEY exists:", !!process.env.STRIPE_DEV_SECRET_KEY);
    console.log("STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY);
  }
  
  // Use environment-specific keys if available
  if (isProduction) {
    if (process.env.STRIPE_PROD_SECRET_KEY) {
      return process.env.STRIPE_PROD_SECRET_KEY;
    }
  } else {
    if (process.env.STRIPE_DEV_SECRET_KEY) {
      return process.env.STRIPE_DEV_SECRET_KEY;
    }
  }
  
  // Fallback to generic STRIPE_SECRET_KEY for backward compatibility
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }
  
  // Error if no key is found - provide helpful debugging info
  const availableKeys = Object.keys(process.env)
    .filter(key => key.includes("STRIPE") && key.includes("SECRET"))
    .join(", ");
  
  throw new Error(
    `Stripe secret key is not set. Please set ${
      isProduction ? "STRIPE_PROD_SECRET_KEY" : "STRIPE_DEV_SECRET_KEY"
    } or STRIPE_SECRET_KEY in environment variables.\n` +
    `Available Stripe-related env vars: ${availableKeys || "none found"}\n` +
    `Make sure your .env.local file is in the project root and restart your dev server.`
  );
}

// Initialize Stripe instance
// This will only be executed when this module is imported on the server side
// Client components should import from @/lib/pricing instead
const stripeSecretKey = getStripeSecretKey();

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

/**
 * Get the appropriate Stripe publishable key based on environment
 * For client-side Stripe integrations (if needed in the future)
 */
export function getStripePublishableKey(): string {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (isProduction) {
    if (process.env.STRIPE_PROD_PUBLISHABLE_KEY) {
      return process.env.STRIPE_PROD_PUBLISHABLE_KEY;
    }
  } else {
    if (process.env.STRIPE_DEV_PUBLISHABLE_KEY) {
      return process.env.STRIPE_DEV_PUBLISHABLE_KEY;
    }
  }
  
  throw new Error(
    `Stripe publishable key is not set. Please set ${
      isProduction ? "STRIPE_PROD_PUBLISHABLE_KEY" : "STRIPE_DEV_PUBLISHABLE_KEY"
    } in environment variables`
  );
}

// Re-export pricing plans from separate file
// This allows client components to import pricing without loading Stripe client
export { SUBSCRIPTION_PLANS } from "./pricing";

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

