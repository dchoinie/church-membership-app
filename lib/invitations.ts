import { randomBytes } from "crypto";

import { db } from "@/db";
import { invitations } from "@/db/schema";

export async function createInvite(email: string, churchId?: string) {
  const code = randomBytes(16).toString("hex");

  await db.insert(invitations).values({
    email,
    code,
    churchId: churchId || null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  });

  return code;
}

