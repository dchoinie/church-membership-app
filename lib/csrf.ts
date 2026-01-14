import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Tokens from "csrf";

const tokens = new Tokens();

const CSRF_SECRET_COOKIE = "csrf-secret";
const CSRF_TOKEN_HEADER = "x-csrf-token";

/**
 * Generate a CSRF secret and token
 * Should be called when rendering forms or pages that need CSRF protection
 */
export async function generateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let secret = cookieStore.get(CSRF_SECRET_COOKIE)?.value;

  // Generate new secret if one doesn't exist
  if (!secret) {
    secret = await tokens.secret();
    cookieStore.set(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return tokens.create(secret);
}

/**
 * Verify CSRF token from request
 * Returns true if token is valid, false otherwise
 */
export async function verifyCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(CSRF_SECRET_COOKIE)?.value;

  if (!secret) {
    return false;
  }

  const token = request.headers.get(CSRF_TOKEN_HEADER);

  if (!token) {
    return false;
  }

  try {
    return tokens.verify(secret, token);
  } catch {
    return false;
  }
}

/**
 * Middleware helper to check CSRF token
 * Returns error response if token is invalid, null if valid
 */
export async function checkCsrfToken(request: Request): Promise<NextResponse | null> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return null;
  }

  // Skip CSRF check for webhook endpoints (they use their own signature verification)
  const url = new URL(request.url);
  if (url.pathname.includes("/webhook") || url.pathname.includes("/api/auth")) {
    return null;
  }

  const isValid = await verifyCsrfToken(request);

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get CSRF token for client-side use
 * This should be called from a Server Component or API route
 */
export async function getCsrfToken(): Promise<string> {
  return await generateCsrfToken();
}

