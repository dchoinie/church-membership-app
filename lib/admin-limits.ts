import { db } from "@/db";
import { churches } from "@/db/schema";
import { userChurches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get the maximum allowed admin users for a subscription plan
 * @param plan The subscription plan type
 * @returns The maximum allowed admin users
 */
export function getAdminLimit(plan: "basic" | "premium" | "free"): number {
  switch (plan) {
    case "basic":
    case "free": // Treat free as basic with 3 admin limit
      return 3;
    case "premium":
      return 10;
    default:
      // Default to basic limit for unknown plans
      return 3;
  }
}

/**
 * Check if adding admin users would exceed the church's plan limit
 * @param churchId The church ID to check
 * @param additionalAdmins The number of admin users to add (default: 1)
 * @returns Object with limit check results
 */
export async function checkAdminLimit(
  churchId: string,
  additionalAdmins: number = 1
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
  const limit = getAdminLimit(plan as "basic" | "premium" | "free");

  // Get all user-church memberships for this church
  const memberships = await db.query.userChurches.findMany({
    where: eq(userChurches.churchId, churchId),
    columns: {
      role: true,
      userId: true,
    },
  });

  if (memberships.length === 0) {
    return {
      allowed: true,
      currentCount: 0,
      limit,
      plan,
      remaining: limit,
    };
  }

  // Get user records to check for super admins
  // Super admins are system-wide and don't count toward church-specific limits
  const { user } = await import("@/auth-schema");
  const userIds = memberships.map(m => m.userId);
  const users = await db.query.user.findMany({
    where: inArray(user.id, userIds),
    columns: {
      id: true,
      isSuperAdmin: true,
    },
  });

  // Create a map for quick lookup
  const userSuperAdminMap = new Map(users.map(u => [u.id, u.isSuperAdmin]));

  // Count only non-super-admin users with admin role
  const currentCount = memberships.filter(
    (m) => m.role === "admin" && !userSuperAdminMap.get(m.userId)
  ).length;

  const newCount = currentCount + additionalAdmins;
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
