import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant-context";
import { verifyUserBelongsToChurch } from "@/lib/tenant-db";
import { handleAuthError } from "@/lib/error-handler";

/**
 * Get authenticated user and tenant context for API routes
 * Returns { user, churchId } or throws error response
 */
export async function getAuthContext(request: Request): Promise<{
  user: { id: string; email: string; churchId: string | null; role: string; isSuperAdmin: boolean };
  churchId: string;
}> {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  // Get tenant context
  const churchId = await getTenantFromRequest(request);
  if (!churchId) {
    throw new Error("TENANT_NOT_FOUND");
  }

  // Get full user record
  const { db } = await import("@/db");
  const { user } = await import("@/auth-schema");
  const { eq } = await import("drizzle-orm");

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!userRecord) {
    throw new Error("USER_NOT_FOUND");
  }

  // Verify user belongs to church (unless super admin)
  if (!userRecord.isSuperAdmin) {
    const belongs = await verifyUserBelongsToChurch(userRecord.id, churchId);
    if (!belongs) {
      throw new Error("FORBIDDEN");
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

// Re-export handleAuthError for backward compatibility
export { handleAuthError };

