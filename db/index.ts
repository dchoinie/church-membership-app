import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as authSchema from "../auth-schema";

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL_NON_POOLING is not set. Update your environment variables with the Postgres connection string.",
  );
}

declare global {
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


