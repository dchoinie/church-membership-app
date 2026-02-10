import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting with Upstash Redis (production) or in-memory fallback (local dev).
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses Redis.
 * Otherwise falls back to in-memory store for local development.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for fallback when Upstash is not configured
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

/** Check if Upstash Redis is configured */
function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Create Upstash Ratelimit instances (lazy-init) */
let authLimiter: Ratelimit | null = null;
let passwordResetLimiter: Ratelimit | null = null;
let apiLimiter: Ratelimit | null = null;
let bulkLimiter: Ratelimit | null = null;
let signupLimiter: Ratelimit | null = null;
let contactLimiter: Ratelimit | null = null;
let supportLimiter: Ratelimit | null = null;

function getUpstashLimiters() {
  if (!isUpstashConfigured()) return null;
  const redis = Redis.fromEnv();
  return {
    auth:
      authLimiter ??
      (authLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(5, "15 m"),
        prefix: "@upstash/ratelimit:auth",
        analytics: false,
        timeout: 3000,
      })),
    passwordReset:
      passwordResetLimiter ??
      (passwordResetLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(3, "1 h"),
        prefix: "@upstash/ratelimit:password-reset",
        analytics: false,
        timeout: 3000,
      })),
    api:
      apiLimiter ??
      (apiLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(100, "1 m"),
        prefix: "@upstash/ratelimit:api",
        analytics: false,
        timeout: 3000,
      })),
    bulk:
      bulkLimiter ??
      (bulkLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(10, "1 h"),
        prefix: "@upstash/ratelimit:bulk",
        analytics: false,
        timeout: 3000,
      })),
    signup:
      signupLimiter ??
      (signupLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(5, "1 h"),
        prefix: "@upstash/ratelimit:signup",
        analytics: false,
        timeout: 3000,
      })),
    contact:
      contactLimiter ??
      (contactLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(5, "15 m"),
        prefix: "@upstash/ratelimit:contact",
        analytics: false,
        timeout: 3000,
      })),
    support:
      supportLimiter ??
      (supportLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(10, "15 m"),
        prefix: "@upstash/ratelimit:support",
        analytics: false,
        timeout: 3000,
      })),
  };
}

/**
 * Rate limit type for Upstash limiter selection
 */
export type RateLimitType =
  | "auth"
  | "passwordReset"
  | "api"
  | "bulk"
  | "signup"
  | "contact"
  | "support";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  type?: RateLimitType;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    type: "auth" as const,
  },
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    type: "passwordReset" as const,
  },
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    type: "api" as const,
  },
  BULK: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    type: "bulk" as const,
  },
  SIGNUP: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    type: "signup" as const,
  },
  CONTACT: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    type: "contact" as const,
  },
  SUPPORT: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    type: "support" as const,
  },
} as const;


/**
 * Get client IP for rate limiting
 */
async function getIp(request: Request | NextRequest): Promise<string> {
  let forwarded: string | null = null;
  let realIp: string | null = null;

  if (request.headers && typeof request.headers.get === "function") {
    forwarded = request.headers.get("x-forwarded-for");
    realIp = request.headers.get("x-real-ip");
  } else {
    try {
      const headersList = await headers();
      forwarded = headersList.get("x-forwarded-for");
      realIp = headersList.get("x-real-ip");
    } catch {
      // headers() fails in middleware
    }
  }

  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

/**
 * In-memory rate limit check (fallback)
 */
async function checkInMemoryRateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = await getIp(request);
  const clientId = `rate-limit:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[Rate Limit] Client: ${ip}, Count: ${entry?.count ?? 0}/${config.maxRequests}`
    );
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
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

  entry.count++;
  rateLimitStore.set(clientId, entry);
  return null;
}

/**
 * Map config to Upstash limiter type (for custom configs like contact/support)
 */
function configToLimiterType(
  config: RateLimitConfig
): RateLimitType | null {
  if (config.type) return config.type;
  // Match by maxRequests and windowMs
  if (config.maxRequests === 5 && config.windowMs === 15 * 60 * 1000)
    return "contact";
  if (config.maxRequests === 10 && config.windowMs === 15 * 60 * 1000)
    return "support";
  return null;
}

/**
 * Check rate limit for a request
 * Returns null if within limit, error response if exceeded
 */
export async function checkRateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiters = getUpstashLimiters();

  if (!limiters) {
    return checkInMemoryRateLimit(request, config);
  }

  const limiterType = configToLimiterType(config);
  const limiter = limiterType ? limiters[limiterType] : limiters.api;

  const ip = await getIp(request);
  const identifier = ip;

  try {
    const { success, limit, remaining, reset } = await limiter.limit(
      identifier
    );

    if (success) {
      return null;
    }

    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(1, retryAfter).toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(reset).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("[Rate Limit] Upstash error, failing open:", error);
    return null; // Fail open to avoid blocking users
  }
}

/**
 * Rate limit middleware helper
 */
export async function rateLimit(
  request: Request | NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  return checkRateLimit(request, config);
}
