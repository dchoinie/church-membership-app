import { headers } from "next/headers";
import { db } from "@/db";
import { churches } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Reserved subdomains that cannot be used by churches
 */
const RESERVED_SUBDOMAINS = [
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "localhost",
  "staging",
  "dev",
  "test",
  "signup",
  "login",
  "auth",
  "stripe",
  "webhooks",
];

/**
 * Extract subdomain from hostname
 * e.g., "church1.yourapp.com" -> "church1"
 * e.g., "localhost:3000" -> null
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(":")[0];
  
  // Split by dots
  const parts = hostWithoutPort.split(".");
  
  // If localhost or IP address, return null
  if (parts.length <= 1 || hostWithoutPort === "localhost") {
    return null;
  }
  
  // For subdomain.domain.com, return the subdomain
  // For domain.com, return null (root domain)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return null;
}

/**
 * Get tenant (church) from request headers
 * Returns the churchId from x-church-id header set by middleware
 */
export async function getTenantFromRequest(
  request: Request
): Promise<string | null> {
  const churchId = request.headers.get("x-church-id");
  return churchId;
}

/**
 * Look up church by subdomain
 */
export async function getChurchBySubdomain(
  subdomain: string
): Promise<typeof churches.$inferSelect | null> {
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return null;
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.subdomain, subdomain.toLowerCase()),
  });

  return church || null;
}

/**
 * Require tenant context - throws if not found
 */
export async function requireTenantContext(
  request: Request
): Promise<string> {
  const churchId = await getTenantFromRequest(request);
  
  if (!churchId) {
    throw new Error("Tenant context not found");
  }
  
  return churchId;
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  if (!subdomain) {
    return false;
  }

  const normalized = subdomain.toLowerCase().trim();

  // Check reserved subdomains
  if (RESERVED_SUBDOMAINS.includes(normalized)) {
    return false;
  }

  // Validate format: 3-30 chars, alphanumeric and hyphens only
  if (!/^[a-z0-9-]{3,30}$/.test(normalized)) {
    return false;
  }

  // Check if already exists
  const existing = await db.query.churches.findFirst({
    where: eq(churches.subdomain, normalized),
  });

  return !existing;
}

