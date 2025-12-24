import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  return userRecord?.isSuperAdmin || false;
}

/**
 * Require super admin - throws error response if not super admin
 */
export async function requireSuperAdmin(request: Request): Promise<{
  user: { id: string; email: string; isSuperAdmin: boolean };
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!userRecord) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!userRecord.isSuperAdmin) {
    throw new Error("FORBIDDEN");
  }

  return {
    user: {
      id: userRecord.id,
      email: userRecord.email,
      isSuperAdmin: userRecord.isSuperAdmin,
    },
  };
}

