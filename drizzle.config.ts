import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// For Drizzle Studio (browser-based), use non-pooling connection if available
// Supabase non-pooling URL (direct connection) works much better than pooling URL for Studio
// Pooling connections can terminate idle connections, causing Studio to crash
let connectionUrl =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

// Add connection parameters to prevent idle connection termination
// PostgreSQL connection strings support query parameters for connection settings
const url = new URL(connectionUrl);
// Add connection timeout and keepalive settings
if (!url.searchParams.has("connect_timeout")) {
  url.searchParams.set("connect_timeout", "10");
}
// Note: keepalive settings are typically handled at the driver level, not URL params
// But we can add them here for drivers that support it

// Warn if using pooler connection (which is more prone to termination)
if (connectionUrl.includes("pooler.supabase.com")) {
  console.warn(
    "\n⚠️  WARNING: Using Supabase pooler connection.\n" +
    "   Pooler connections can terminate idle connections, causing Drizzle Studio to crash.\n" +
    "   For better stability, set POSTGRES_URL_NON_POOLING to use the direct connection.\n" +
    "   You can find this in your Supabase dashboard under Settings > Database > Connection string (Direct connection).\n"
  );
}

connectionUrl = url.toString();

export default defineConfig({
  schema: ["./db/schema.ts", "./auth-schema.ts"],
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: {
    url: connectionUrl,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase and other services with self-signed certs
    },
  },
  verbose: true,
  strict: false, // Disable strict mode - sometimes causes Studio issues
  tablesFilter: ["!*_migrations*"], // Filter out migration tables if any
});

