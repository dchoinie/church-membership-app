// Pricing plans configuration
// Separated from stripe.ts to avoid loading Stripe client on the client side

// Test mode price IDs (for development)
const TEST_PRICE_IDS = {
  basic: "price_1SnpdeE37eeYXorXR1YROl11",
  premium: "price_1SnpeGE37eeYXorXtV94detn",
};

// Production mode price IDs (for live/production)
const PROD_PRICE_IDS = {
  basic: "price_1SnnGYE37eeYXorXLDiGjlml",
  premium: "price_1SnnHDE37eeYXorXbI5WTIPl",
};

/**
 * Get the appropriate price ID based on environment
 * This function should only be called on the server side
 */
export function getPriceId(plan: "basic" | "premium"): string {
  // Check if we're using test mode keys (development)
  const isProduction = process.env.NODE_ENV === "production";
  const usingTestKey = !isProduction && !!process.env.STRIPE_DEV_SECRET_KEY;
  
  // Use test price IDs in development when using test keys
  // Use production price IDs in production or when using production keys
  if (usingTestKey || (!isProduction && !process.env.STRIPE_PROD_SECRET_KEY)) {
    return TEST_PRICE_IDS[plan];
  }
  
  return PROD_PRICE_IDS[plan];
}

export const SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic",
    priceId: "price_1SnnGYE37eeYXorXLDiGjlml", // Used for display only - actual price ID resolved server-side
    price: 9.99,
    features: ["Up to 300 members"],
  },
  premium: {
    name: "Premium",
    priceId: "price_1SnnHDE37eeYXorXbI5WTIPl", // Used for display only - actual price ID resolved server-side
    price: 29.99,
    features: ["300+ members"],
  },
} as const;

