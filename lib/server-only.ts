/**
 * Server-only marker
 * This file helps ensure server-only code is not imported in client components
 */

export function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("This module can only be imported in server-side code");
  }
}
