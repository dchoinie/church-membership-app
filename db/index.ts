import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as authSchema from "../auth-schema";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Update your environment variables with the Supabase connection string.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __drizzleClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.__drizzleClient ??
  postgres(connectionString, {
    ssl: "require",
    max: 5,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__drizzleClient = client;
}

export const db = drizzle(client, { schema: { ...schema, ...authSchema } });


