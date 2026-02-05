import { db } from "@/db";
import { user } from "@/auth-schema";
import { userChurches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

  // Regular users must belong to the church - check junction table
  const membership = await db.query.userChurches.findFirst({
    where: and(
      eq(userChurches.userId, userId),
      eq(userChurches.churchId, churchId)
    ),
  });

  return !!membership;
}

/**
 * Get all churches a user belongs to with their roles
 */
export async function getUserChurches(userId: string): Promise<Array<{
  churchId: string;
  role: string;
}>> {
  const memberships = await db.query.userChurches.findMany({
    where: eq(userChurches.userId, userId),
  });

  return memberships.map(m => ({
    churchId: m.churchId,
    role: String(m.role),
  }));
}

/**
 * Get user's role for a specific church
 */
export async function getUserChurchRole(
  userId: string,
  churchId: string
): Promise<string | null> {
  const membership = await db.query.userChurches.findFirst({
    where: and(
      eq(userChurches.userId, userId),
      eq(userChurches.churchId, churchId)
    ),
  });

  return membership?.role ? String(membership.role) : null;
}

/**
 * Add a user to a church with a specific role
 */
export async function addUserToChurch(
  userId: string,
  churchId: string,
  role: string = "viewer"
): Promise<void> {
  // Validate and cast role to enum type
  const validRoles = ["admin", "viewer", "members_editor", "giving_editor", "attendance_editor", "reports_viewer", "analytics_viewer"] as const;
  const validRole = validRoles.includes(role as typeof validRoles[number]) ? (role as typeof validRoles[number]) : "viewer";

  // Check if membership already exists
  const existing = await db.query.userChurches.findFirst({
    where: and(
      eq(userChurches.userId, userId),
      eq(userChurches.churchId, churchId)
    ),
  });

  if (existing) {
    // Update existing membership
    await db.update(userChurches)
      .set({ role: validRole, updatedAt: new Date() })
      .where(and(
        eq(userChurches.userId, userId),
        eq(userChurches.churchId, churchId)
      ));
  } else {
    // Create new membership
    await db.insert(userChurches).values({
      userId,
      churchId,
      role: validRole,
    });
  }
}

/**
 * Remove a user from a church
 */
export async function removeUserFromChurch(
  userId: string,
  churchId: string
): Promise<void> {
  await db.delete(userChurches)
    .where(and(
      eq(userChurches.userId, userId),
      eq(userChurches.churchId, churchId)
    ));
}

/**
 * Get user's church ID (deprecated - returns first church)
 * @deprecated Use getUserChurches() instead
 */
export async function getUserChurchId(userId: string): Promise<string | null> {
  const memberships = await getUserChurches(userId);
  return memberships.length > 0 ? memberships[0].churchId : null;
}

