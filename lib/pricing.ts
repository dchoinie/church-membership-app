// Pricing plans configuration
// Separated from stripe.ts to avoid loading Stripe client on the client side

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

