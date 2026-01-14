import { NextResponse } from "next/server";
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
 */
async function getClientId(request: Request): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return `rate-limit:${ip}`;
}

/**
 * Check rate limit for a request
 * Returns null if within limit, error response if exceeded
 */
export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const clientId = await getClientId(request);
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

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
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  return await checkRateLimit(request, config);
}

