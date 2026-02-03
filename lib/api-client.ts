/**
 * Centralized API client with automatic CSRF token handling
 * 
 * This wrapper around fetch automatically adds CSRF tokens to all mutating requests
 * (POST, PUT, DELETE, PATCH) to protect against CSRF attacks.
 * 
 * Usage:
 *   import { apiFetch } from "@/lib/api-client";
 *   
 *   // GET request (no CSRF needed)
 *   const response = await apiFetch("/api/members");
 *   
 *   // POST request (CSRF token automatically added)
 *   const response = await apiFetch("/api/members", {
 *     method: "POST",
 *     body: JSON.stringify(data),
 *   });
 */

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

/**
 * Get CSRF token, with caching to avoid multiple requests
 */
async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  // If a request is already in flight, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Fetch new token
  csrfTokenPromise = (async () => {
    try {
      const response = await fetch("/api/csrf-token");
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const data = await response.json();
      csrfTokenCache = data.token;
      return data.token;
    } catch (error) {
      // Reset promise on error so we can retry
      csrfTokenPromise = null;
      throw error;
    }
  })();

  return csrfTokenPromise;
}

/**
 * Clear CSRF token cache (useful for testing or after logout)
 */
export function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

/**
 * Check if a request method requires CSRF protection
 */
function requiresCsrfToken(method: string | undefined): boolean {
  if (!method) return false;
  const upperMethod = method.toUpperCase();
  return ["POST", "PUT", "DELETE", "PATCH"].includes(upperMethod);
}

/**
 * Custom fetch wrapper that automatically adds CSRF tokens to mutating requests
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @returns Promise<Response> - Same as native fetch
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // Set Content-Type to application/json if body is provided and not already set
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Add CSRF token for mutating requests
  if (requiresCsrfToken(options.method)) {
    try {
      const token = await getCsrfToken();
      headers.set("x-csrf-token", token);
    } catch (error) {
      console.error("Failed to get CSRF token:", error);
      // Continue without token - server will reject with proper error
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
