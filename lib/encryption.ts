import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc_v1_";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyB64 = process.env.ENCRYPTION_KEY;
  if (!keyB64 || keyB64.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production");
    }
    throw new Error(
      "ENCRYPTION_KEY must be set. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const key = Buffer.from(keyB64, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}. Regenerate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return key;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns empty string for null/empty input.
 * Output format: enc_v1_<base64(iv + ciphertext + authTag)>
 */
export function encrypt(plaintext: string | null | undefined): string {
  if (plaintext == null || plaintext === "") {
    return "";
  }
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return PREFIX + combined.toString("base64");
}

/**
 * Decrypts a value. If it starts with enc_v1_, decrypt and return plaintext.
 * Otherwise return as-is (backward compatibility for existing plaintext).
 * Returns empty string for null/empty input.
 */
export function decrypt(value: string | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }
  if (!value.startsWith(PREFIX)) {
    return value;
  }
  const key = getEncryptionKey();
  const combined = Buffer.from(value.slice(PREFIX.length), "base64");
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted value: too short");
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8");
}

type ChurchWithTaxId = { taxId?: string | null; [key: string]: unknown };

/**
 * Decrypts sensitive fields on a church object. Returns a new object with taxId decrypted.
 */
export function decryptChurch<T extends ChurchWithTaxId>(church: T): T {
  if (!church || typeof church !== "object") return church;
  if (church.taxId != null && church.taxId !== "") {
    try {
      return { ...church, taxId: decrypt(church.taxId) };
    } catch {
      return { ...church, taxId: "" };
    }
  }
  return church;
}

type MemberWithDateOfBirth = { dateOfBirth?: string | null; [key: string]: unknown };

/**
 * Decrypts sensitive fields on a member object. Returns a new object with dateOfBirth decrypted.
 */
export function decryptMember<T extends MemberWithDateOfBirth>(member: T): T {
  if (!member || typeof member !== "object") return member;
  if (member.dateOfBirth != null && member.dateOfBirth !== "") {
    try {
      return { ...member, dateOfBirth: decrypt(member.dateOfBirth) };
    } catch {
      return { ...member, dateOfBirth: "" };
    }
  }
  return member;
}
