import { db } from "@/db";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";

/**
 * Verify that a user belongs to a specific church
 */
export async function verifyUserBelongsToChurch(
  userId: string,
  churchId: string
): Promise<boolean> {
  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!userRecord) {
    return false;
  }

  // Super admins can access any church (for admin panel)
  if (userRecord.isSuperAdmin) {
    return true;
  }

  // Regular users must belong to the church
  return userRecord.churchId === churchId;
}

/**
 * Get user's church ID
 */
export async function getUserChurchId(userId: string): Promise<string | null> {
  const userRecord = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  return userRecord?.churchId || null;
}

