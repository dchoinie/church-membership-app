import "dotenv/config";
import { db } from "../db";
import { user } from "../auth-schema";
import { eq } from "drizzle-orm";

/**
 * One-time script to mark all existing users as email verified.
 * This should be run before deploying email verification to ensure
 * existing users can continue using the app without interruption.
 * 
 * Run with: npx tsx scripts/mark-existing-users-verified.ts
 */

async function markExistingUsersVerified() {
  try {
    console.log("Starting to mark existing users as verified...");

    // Get all users that are not verified
    const unverifiedUsers = await db.query.user.findMany({
      where: eq(user.emailVerified, false),
    });

    if (unverifiedUsers.length === 0) {
      console.log("No unverified users found. All users are already verified.");
      process.exit(0);
    }

    console.log(`Found ${unverifiedUsers.length} unverified user(s):`);
    unverifiedUsers.forEach((u) => {
      console.log(`  - ${u.email} (${u.name})`);
    });

    // Update all unverified users to verified
    const result = await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.emailVerified, false));

    console.log(`\nSuccessfully marked ${unverifiedUsers.length} user(s) as verified.`);
    console.log("Existing users can now continue using the app without interruption.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error marking users as verified:", error);
    process.exit(1);
  }
}

// Run the script
markExistingUsersVerified();

