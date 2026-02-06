/**
 * Server-only permission functions
 * These functions require database access and should only be used in API routes
 */

import type { SubscriptionPlan } from "./permissions";
import { canManageGivingStatementsRole } from "./permissions";

/**
 * Check if user can manage giving statements with DB lookup
 * Used in API routes to verify permissions
 */
export async function canManageGivingStatements(
  userId: string,
  churchId: string
): Promise<boolean> {
  // Server-only: Dynamic import to prevent client bundling
  if (typeof window !== "undefined") {
    throw new Error("canManageGivingStatements can only be called from server-side code");
  }
  
  try {
    const { db } = await import("@/db");
    const { userChurches, churches } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    // Get user's role and church subscription plan
    const result = await db
      .select({
        role: userChurches.role,
        subscriptionPlan: churches.subscriptionPlan,
      })
      .from(userChurches)
      .innerJoin(churches, eq(userChurches.churchId, churches.id))
      .where(and(eq(userChurches.userId, userId), eq(userChurches.churchId, churchId)))
      .limit(1);

    if (!result || result.length === 0) {
      return false;
    }

    const { role, subscriptionPlan } = result[0];
    
    // Use subscription plan directly (defaults to "basic" if null)
    const plan: SubscriptionPlan = (subscriptionPlan || "basic") as SubscriptionPlan;

    return canManageGivingStatementsRole(role, plan);
  } catch (error) {
    console.error("Error checking giving statements permission:", error);
    return false;
  }
}
