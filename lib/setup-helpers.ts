/**
 * Utility functions for checking setup completion status
 */

interface Church {
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
  stripeSubscriptionId: string | null;
}

/**
 * Check if church setup is complete
 * Setup is complete when:
 * - Subscription status is "active", OR
 * - Subscription status is "trialing" with a Stripe subscription ID (paid plans)
 */
export function isSetupComplete(church: Church | null): boolean {
  if (!church) {
    return false;
  }

  return (
    church.subscriptionStatus === "active" ||
    (church.subscriptionStatus === "trialing" && church.stripeSubscriptionId !== null)
  );
}

