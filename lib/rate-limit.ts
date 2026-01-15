import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";

/**
 * Simple in-memory rate limiter
 * For production, consider upgrading to Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (clears on server restart)
// In production with multiple instances, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Clear all rate limit entries (development only)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Clear rate limit for a specific IP address (development only)
 */
export function clearRateLimitForIp(ip: string): void {
  const key = `rate-limit:${ip}`;
  rateLimitStore.delete(key);
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Password reset - very strict
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // General API - moderate limits
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Bulk operations - strict limits
  BULK: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Signup - moderate limits
  SIGNUP: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Get client identifier for rate limiting
 * Uses IP address from headers
 * Works with both NextRequest (middleware) and Request (route handlers)
 */
async function getClientId(request: Request | NextRequest): Promise<string> {
  let forwarded: string | null = null;
  let realIp: string | null = null;
  
  // Both Request and NextRequest have headers property
  // In middleware (NextRequest), we must use request.headers directly
  // In route handlers (Request), we can also use request.headers
  if (request.headers && typeof request.headers.get === 'function') {
    // Use headers from request directly (works in both middleware and route handlers)
    forwarded = request.headers.get("x-forwarded-for");
    realIp = request.headers.get("x-real-ip");
  } else {
    // Fallback: try next/headers (only works in route handlers, not middleware)
    try {
      const headersList = await headers();
      forwarded = headersList.get("x-forwarded-for");
      realIp = headersList.get("x-real-ip");
    } catch {
      // headers() will fail in middleware - this is expected
      // We should have already gotten headers from request.headers above
    }
  }
  
  // Extract IP from forwarded header (first IP in chain)
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return `rate-limit:${ip}`;
}

/**
 * Check rate limit for a request
 * Returns null if within limit, error response if exceeded
 * Accepts both NextRequest (middleware) and Request (route handlers)
 */
export async function checkRateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const clientId = await getClientId(request);
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);
  
  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Rate Limit] Client ID: ${clientId}, Count: ${entry?.count || 0}/${config.maxRequests}, Reset At: ${entry ? new Date(entry.resetAt).toISOString() : 'N/A'}`);
  }

  // No entry or expired entry - create new
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(clientId, entry);

  return null;
}

/**
 * Rate limit middleware helper
 * Checks rate limit and returns error response if exceeded
 * Accepts both NextRequest (middleware) and Request (route handlers)
 */
export async function rateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  return await checkRateLimit(request, config);
}

