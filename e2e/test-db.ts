/**
 * Test database helpers
 * Creates and cleans up test data for E2E tests
 */

// Load environment variables before importing database
import "dotenv/config";

import { db } from "@/db";
import { churches } from "@/db/schema";
import { user } from "@/auth-schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
export interface TestUserData {
  email: string;
  password: string;
  name: string;
  emailVerified?: boolean;
}

export interface TestChurchData {
  name: string;
  subdomain: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "unpaid";
  subscriptionPlan?: "basic" | "premium";
  stripeSubscriptionId?: string | null;
}

/**
 * Create a test user with verified email (for testing)
 */
export async function createTestUser(data: TestUserData): Promise<{ userId: string; email: string }> {
  const { email, password, name, emailVerified = true } = data;

  // Create user via Better Auth
  const signupResponse = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
    headers: new Headers(),
    asResponse: true,
  });

  if (!signupResponse.ok) {
    const errorData = await signupResponse.json().catch(() => ({}));
    throw new Error(`Failed to create test user: ${JSON.stringify(errorData)}`);
  }

  const signupData = await signupResponse.json();
  const userId = signupData.user?.id;

  if (!userId) {
    throw new Error("Failed to get user ID after signup");
  }

  // Mark email as verified if requested (for testing)
  if (emailVerified) {
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, userId));
  }

  return { userId, email };
}

/**
 * Create a test church
 */
export async function createTestChurch(data: TestChurchData): Promise<{ churchId: string; subdomain: string }> {
  const {
    name,
    subdomain,
    subscriptionStatus = "unpaid",
    subscriptionPlan = "basic",
    stripeSubscriptionId = null,
  } = data;

  // Create church
  const [church] = await db
    .insert(churches)
    .values({
      name,
      subdomain: subdomain.toLowerCase(),
      subscriptionStatus,
      subscriptionPlan,
      stripeSubscriptionId,
    })
    .returning();

  if (!church) {
    throw new Error("Failed to create test church");
  }

  return { churchId: church.id, subdomain: church.subdomain };
}

/**
 * Link a user to a church
 */
export async function linkUserToChurch(userId: string, churchId: string, role: "admin" | "viewer" = "admin"): Promise<void> {
  const { addUserToChurch } = await import("@/lib/tenant-db");
  await addUserToChurch(userId, churchId, role);
}

/**
 * Create a complete test setup: church + user + link
 * Creates church first, then user, then links them together
 */
export async function createTestSetup(
  userData: TestUserData,
  churchData: TestChurchData
): Promise<{
  userId: string;
  churchId: string;
  email: string;
  subdomain: string;
}> {
  // Create church first
  const { churchId, subdomain } = await createTestChurch(churchData);

  // Create user (Better Auth will create the user)
  const { userId, email } = await createTestUser(userData);

  // Link user to church
  await linkUserToChurch(userId, churchId, "admin");

  return { userId, churchId, email, subdomain };
}

/**
 * Clean up test data
 * Note: Deletes users first (which will cascade), then churches
 */
export async function cleanupTestData(identifiers: {
  userIds?: string[];
  churchIds?: string[];
  emails?: string[];
  subdomains?: string[];
}): Promise<void> {
  const { userIds = [], churchIds = [], emails = [], subdomains = [] } = identifiers;

  // Delete users by email first (to get their IDs if needed)
  const allUserIds = [...userIds];
  if (emails.length > 0) {
    for (const email of emails) {
      const userToDelete = await db.query.user.findFirst({
        where: eq(user.email, email),
      });
      if (userToDelete && !allUserIds.includes(userToDelete.id)) {
        allUserIds.push(userToDelete.id);
      }
    }
  }

  // Delete users by ID (this will cascade delete related data)
  if (allUserIds.length > 0) {
    for (const userId of allUserIds) {
      try {
        await db.delete(user).where(eq(user.id, userId));
      } catch (error) {
        // Ignore errors if user already deleted
        console.warn(`Failed to delete user ${userId}:`, error);
      }
    }
  }

  // Delete churches by subdomain
  if (subdomains.length > 0) {
    for (const subdomain of subdomains) {
      try {
        await db.delete(churches).where(eq(churches.subdomain, subdomain.toLowerCase()));
      } catch (error) {
        // Ignore errors if church already deleted
        console.warn(`Failed to delete church ${subdomain}:`, error);
      }
    }
  }

  // Delete churches by ID
  if (churchIds.length > 0) {
    for (const churchId of churchIds) {
      try {
        await db.delete(churches).where(eq(churches.id, churchId));
      } catch (error) {
        // Ignore errors if church already deleted
        console.warn(`Failed to delete church ${churchId}:`, error);
      }
    }
  }
}

/**
 * Generate unique test identifiers
 */
export function generateTestIdentifiers(prefix: string = "test"): {
  email: string;
  subdomain: string;
  name: string;
} {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return {
    email: `${prefix}-${timestamp}-${random}@test.example.com`,
    subdomain: `${prefix}-${timestamp}-${random}`,
    name: `Test ${prefix} ${timestamp}`,
  };
}

