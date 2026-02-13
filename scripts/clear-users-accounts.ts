/**
 * Clear all users, accounts, sessions, and user-church associations
 * Run with: npx tsx scripts/clear-users-accounts.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function clearUsersAndAccounts() {
  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL or POSTGRES_URL_NON_POOLING not set");
    process.exit(1);
  }

  const sql = postgres(connectionString, { ssl: "require", max: 1 });

  console.log("🗑️  Clearing users, accounts, sessions, and user-church links...");

  try {
    await sql`DELETE FROM session`;
    console.log("   ✓ Cleared sessions");

    await sql`DELETE FROM account`;
    console.log("   ✓ Cleared accounts");

    await sql`DELETE FROM user_churches`;
    console.log("   ✓ Cleared user_churches");

    await sql`DELETE FROM verification`;
    console.log("   ✓ Cleared verification tokens");

    await sql`DELETE FROM "user"`;
    console.log("   ✓ Cleared users");

    console.log("\n✅ Database cleared. Ready for fresh signups.");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

clearUsersAndAccounts();
