// Pricing plans configuration
// Separated from stripe.ts to avoid loading Stripe client on the client side

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic",
    priceId: "price_1SnnGYE37eeYXorXLDiGjlml",
    price: 9.99,
    features: ["Up to 300 members"],
  },
  premium: {
    name: "Premium",
    priceId: "price_1SnnHDE37eeYXorXbI5WTIPl",
    price: 29.99,
    features: ["300+ members"],
  },
} as const;

