import { churches } from "@/db/schema";

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
 * e.g., "church1.simplechurchtools.com" -> "church1"
 * e.g., "church1.localhost" -> "church1"
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
  
  // Handle subdomain.localhost format for local development
  if (parts.length === 2 && parts[1] === "localhost") {
    return parts[0];
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
 * First checks for x-church-id header set by middleware
 * If not found, extracts subdomain from request URL and looks up church
 * This ensures it works for both server-side requests (with header) and client-side fetch requests (from URL)
 */
export async function getTenantFromRequest(
  request: Request
): Promise<string | null> {
  // First, check if middleware set the header (for server-side requests)
  const churchId = request.headers.get("x-church-id");
  if (churchId) {
    return churchId;
  }

  // If no header, extract subdomain from request URL (for client-side fetch requests)
  // Get hostname from URL or Host header
  const url = new URL(request.url);
  const hostname = url.hostname || request.headers.get("host") || "";
  
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) {
    return null;
  }

  // Look up church by subdomain and return its ID
  const church = await getChurchBySubdomain(subdomain);
  return church?.id || null;
}

/**
 * Look up church by subdomain
 * Uses Supabase service role client to bypass RLS for public operations
 * Normalizes snake_case field names from Supabase to camelCase to match Drizzle format
 */
export async function getChurchBySubdomain(
  subdomain: string
): Promise<typeof churches.$inferSelect | null> {
  if (!subdomain || RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return null;
  }

  // Use Supabase service role client to bypass RLS when looking up churches by subdomain
  const { createServiceClient } = await import("@/utils/supabase/service");
  const supabase = createServiceClient();
  
  const { data: church, error } = await supabase
    .from("churches")
    .select("*")
    .eq("subdomain", subdomain.toLowerCase())
    .limit(1)
    .single();

  if (error || !church) {
    return null;
  }

  // Normalize snake_case fields from Supabase to camelCase to match Drizzle format
  const normalizedChurch = {
    ...church,
    logoUrl: church.logo_url,
    primaryColor: church.primary_color,
    subscriptionStatus: church.subscription_status,
    subscriptionPlan: church.subscription_plan,
    trialEndsAt: church.trial_ends_at,
    stripeCustomerId: church.stripe_customer_id,
    stripeSubscriptionId: church.stripe_subscription_id,
    createdAt: church.created_at,
    updatedAt: church.updated_at,
    // Remove snake_case fields to avoid confusion
    logo_url: undefined,
    primary_color: undefined,
    subscription_status: undefined,
    subscription_plan: undefined,
    trial_ends_at: undefined,
    stripe_customer_id: undefined,
    stripe_subscription_id: undefined,
    created_at: undefined,
    updated_at: undefined,
  };

  return normalizedChurch as typeof churches.$inferSelect;
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
 * Uses Supabase service role client to bypass RLS for public signup flow
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

  // Check if already exists - use Supabase service role client to bypass RLS
  const { createServiceClient } = await import("@/utils/supabase/service");
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from("churches")
    .select("id")
    .eq("subdomain", normalized)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned (which is fine)
    console.error("Error checking subdomain availability:", error);
    return false;
  }

  return !data; // Available if no data found
}

