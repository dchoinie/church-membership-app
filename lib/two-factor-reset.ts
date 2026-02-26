import { db } from "@/db";
import { user, twoFactor, twoFactorResetToken } from "@/auth-schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Clears 2FA for a user: deletes two_factor row, sets twoFactorEnabled=false,
 * requires2FASetup=true. User must re-enroll via setup-2fa.
 */
export async function clearUser2FA(userId: string): Promise<void> {
  await db.delete(twoFactor).where(eq(twoFactor.userId, userId));
  await db
    .update(user)
    .set({ twoFactorEnabled: false, requires2FASetup: true })
    .where(eq(user.id, userId));
}

/**
 * Creates a 2FA reset token for the user. Token expires in 1 hour.
 * Returns the raw token string to include in the reset URL.
 */
export async function create2FAResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const id = randomBytes(16).toString("hex");

  await db.insert(twoFactorResetToken).values({
    id,
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Validates and consumes a 2FA reset token. If valid, clears user 2FA and returns userId.
 * Returns null if token is invalid or expired.
 */
export async function consume2FAResetToken(
  token: string
): Promise<string | null> {
  const [record] = await db
    .select()
    .from(twoFactorResetToken)
    .where(
      and(
        eq(twoFactorResetToken.token, token),
        gt(twoFactorResetToken.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!record) {
    return null;
  }

  await clearUser2FA(record.userId);
  await db
    .delete(twoFactorResetToken)
    .where(eq(twoFactorResetToken.id, record.id));

  return record.userId;
}
