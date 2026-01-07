import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as authSchema from "../auth-schema";

// Use service role connection string for operations that need to bypass RLS
// Falls back to regular connection if service role is not set
const connectionString = process.env.POSTGRES_URL_SERVICE_ROLE || process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL_SERVICE_ROLE or POSTGRES_URL_NON_POOLING is not set. " +
    "Update your environment variables with the Supabase connection string."
  );
}

declare global {
  var __drizzleServiceClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__drizzleServiceClient ??
  postgres(connectionString, {
    ssl: "require",
    max: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__drizzleServiceClient = client;
}

export const serviceDb = drizzle(client, { schema: { ...schema, ...authSchema } });

