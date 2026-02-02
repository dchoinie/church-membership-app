import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { verifyUserBelongsToChurch } from "@/lib/tenant-db";
import { handleAuthError } from "@/lib/error-handler";
import {
  canEditMembers,
  canEditGiving,
  canEditAttendance,
  canViewReports,
  canViewAnalytics,
  type SubscriptionPlan,
} from "@/lib/permissions";

/**
 * Get authenticated user and tenant context for API routes
 * Returns { user, churchId } or throws error response
 * 
 * For super admins: Allows overriding churchId via ?churchId query param or x-church-id header
 * This allows super admins to access any church's data regardless of subdomain
 */
export async function getAuthContext(request: Request): Promise<{
  user: { id: string; email: string; churchId: string | null; role: string; isSuperAdmin: boolean };
  churchId: string;
}> {
  // Get session - convert request headers to Headers object for better-auth
  // This works more reliably in API route handlers, especially in production
  // Using next/headers() can fail in API routes, so we use request headers directly
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.set(key, value);
  });
  
  const session = await auth.api.getSession({
    headers,
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  // Get full user record first to check if super admin
  const { db } = await import("@/db");
  const { user } = await import("@/auth-schema");
  const { eq } = await import("drizzle-orm");

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!userRecord) {
    throw new Error("USER_NOT_FOUND");
  }

  // For super admins: Check if they're overriding the churchId
  let churchId: string | null = null;
  if (userRecord.isSuperAdmin) {
    // Super admins can override churchId via query param or header
    const url = new URL(request.url);
    const queryChurchId = url.searchParams.get("churchId");
    const headerChurchId = request.headers.get("x-church-id-override");
    
    if (queryChurchId || headerChurchId) {
      churchId = queryChurchId || headerChurchId;
    }
  }

  // If no override, get tenant context from subdomain
  if (!churchId) {
    churchId = await getTenantFromRequest(request);
  }

  if (!churchId) {
    throw new Error("TENANT_NOT_FOUND");
  }

  // Verify user belongs to church (unless super admin)
  if (!userRecord.isSuperAdmin) {
    const belongs = await verifyUserBelongsToChurch(userRecord.id, churchId);
    if (!belongs) {
      throw new Error("FORBIDDEN");
    }
  }

  // For super admins overriding churchId, verify the church exists
  if (userRecord.isSuperAdmin && (new URL(request.url).searchParams.get("churchId") || request.headers.get("x-church-id-override"))) {
    const { churches } = await import("@/db/schema");
    const church = await db.query.churches.findFirst({
      where: eq(churches.id, churchId),
    });
    if (!church) {
      throw new Error("TENANT_NOT_FOUND");
    }
  }

  return {
    user: {
      id: userRecord.id,
      email: userRecord.email,
      churchId: userRecord.churchId || null,
      role: userRecord.role,
      isSuperAdmin: userRecord.isSuperAdmin,
    },
    churchId,
  };
}

/**
 * Require admin role - throws error if user is not admin or super admin
 * Use this in POST/PUT/DELETE endpoints to prevent viewers from modifying data
 * Also use for user management operations (admin only)
 */
export async function requireAdmin(request: Request): Promise<{
  user: { id: string; email: string; churchId: string | null; role: string; isSuperAdmin: boolean };
  churchId: string;
}> {
  const context = await getAuthContext(request);

  // Super admins can always perform admin actions
  if (context.user.isSuperAdmin) {
    return context;
  }

  // Check if user is admin (not viewer)
  if (context.user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return context;
}

/**
 * Require specific permission - throws error if user doesn't have the required permission
 * Fetches church subscription plan and checks permission based on role and plan
 */
export async function requirePermission(
  permission: "members_edit" | "giving_edit" | "attendance_edit" | "reports_view" | "analytics_view",
  request: Request,
): Promise<{
  user: { id: string; email: string; churchId: string | null; role: string; isSuperAdmin: boolean };
  churchId: string;
  subscriptionPlan: SubscriptionPlan;
}> {
  const context = await getAuthContext(request);

  // Super admins can always perform any action
  if (context.user.isSuperAdmin) {
    // Fetch subscription plan for consistency
    const { db } = await import("@/db");
    const { churches } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const church = await db.query.churches.findFirst({
      where: eq(churches.id, context.churchId),
    });

    return {
      ...context,
      subscriptionPlan: (church?.subscriptionPlan || "basic") as SubscriptionPlan,
    };
  }

  // Fetch church subscription plan
  const { db } = await import("@/db");
  const { churches } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, context.churchId),
  });

  if (!church) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const subscriptionPlan = (church.subscriptionPlan || "basic") as SubscriptionPlan;

  // Check permission based on role and subscription plan
  let hasPermission = false;

  switch (permission) {
    case "members_edit":
      hasPermission = canEditMembers(context.user.role, subscriptionPlan);
      break;
    case "giving_edit":
      hasPermission = canEditGiving(context.user.role, subscriptionPlan);
      break;
    case "attendance_edit":
      hasPermission = canEditAttendance(context.user.role, subscriptionPlan);
      break;
    case "reports_view":
      hasPermission = canViewReports(context.user.role, subscriptionPlan);
      break;
    case "analytics_view":
      hasPermission = canViewAnalytics(context.user.role, subscriptionPlan);
      break;
  }

  if (!hasPermission) {
    throw new Error("FORBIDDEN");
  }

  return {
    ...context,
    subscriptionPlan,
  };
}

// Re-export handleAuthError for backward compatibility
export { handleAuthError };

