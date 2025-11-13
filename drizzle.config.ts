import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

// For Drizzle Studio (browser-based), use non-pooling connection if available
// Supabase non-pooling URL (port 5432) works better than pooling URL (port 6543) for Studio
const connectionUrl =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

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

