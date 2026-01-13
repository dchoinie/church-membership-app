import { db } from "@/db";
import { churches, members } from "@/db/schema";
import { eq, count } from "drizzle-orm";

/**
 * Get the maximum allowed members for a subscription plan
 * @param plan The subscription plan type
 * @returns The maximum allowed members (Infinity for unlimited)
 */
export function getMemberLimit(plan: "basic" | "premium" | "free"): number {
  switch (plan) {
    case "basic":
    case "free": // Treat free as basic with 300 member limit
      return 300;
    case "premium":
      return Infinity;
    default:
      // Default to basic limit for unknown plans
      return 300;
  }
}

/**
 * Check if adding members would exceed the church's plan limit
 * @param churchId The church ID to check
 * @param additionalMembers The number of members to add
 * @returns Object with limit check results
 */
export async function checkMemberLimit(
  churchId: string,
  additionalMembers: number
): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  plan: string;
  remaining: number;
}> {
  // Fetch church's subscription plan
  const church = await db.query.churches.findFirst({
    where: eq(churches.id, churchId),
    columns: {
      subscriptionPlan: true,
    },
  });

  if (!church) {
    throw new Error("Church not found");
  }

  const plan = church.subscriptionPlan || "basic";
  const limit = getMemberLimit(plan as "basic" | "premium" | "free");

  // Get current member count
  const [memberCountResult] = await db
    .select({ count: count() })
    .from(members)
    .where(eq(members.churchId, churchId));

  const currentCount = memberCountResult.count;
  const newCount = currentCount + additionalMembers;
  const allowed = newCount <= limit;
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed,
    currentCount,
    limit,
    plan,
    remaining,
  };
}

