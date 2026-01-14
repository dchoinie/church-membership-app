import { NextResponse } from "next/server";

/**
 * Sanitize error messages for production
 * In production, hide sensitive details like database errors, stack traces, file paths
 * In development, show helpful error messages
 */
export function sanitizeError(error: unknown): {
  message: string;
  status: number;
  details?: unknown;
} {
  const isProduction = process.env.NODE_ENV === "production";

  // Handle Error instances
  if (error instanceof Error) {
    const errorMessage = error.message;

    // Known error types that we handle explicitly
    if (
      errorMessage === "UNAUTHORIZED" ||
      errorMessage === "TENANT_NOT_FOUND" ||
      errorMessage === "USER_NOT_FOUND" ||
      errorMessage === "FORBIDDEN"
    ) {
      return {
        message: errorMessage,
        status: getStatusForError(errorMessage),
      };
    }

    // Database errors
    if (errorMessage.includes("violates") || errorMessage.includes("constraint")) {
      if (isProduction) {
        return {
          message: "A database constraint was violated",
          status: 400,
          details: isProduction ? undefined : error.stack,
        };
      }
      return {
        message: errorMessage,
        status: 400,
        details: error.stack,
      };
    }

    // Connection errors
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection")
    ) {
      if (isProduction) {
        return {
          message: "Service temporarily unavailable",
          status: 503,
          details: isProduction ? undefined : error.stack,
        };
      }
      return {
        message: errorMessage,
        status: 503,
        details: error.stack,
      };
    }

    // File system errors (shouldn't happen in production, but just in case)
    if (errorMessage.includes("ENOENT") || errorMessage.includes("path")) {
      if (isProduction) {
        return {
          message: "Resource not found",
          status: 404,
          details: isProduction ? undefined : error.stack,
        };
      }
      return {
        message: errorMessage,
        status: 404,
        details: error.stack,
      };
    }

    // Generic error - show message in dev, generic in prod
    if (isProduction) {
      return {
        message: "An error occurred processing your request",
        status: 500,
        details: undefined,
      };
    }

    return {
      message: errorMessage,
      status: 500,
      details: error.stack,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    if (isProduction) {
      return {
        message: "An error occurred processing your request",
        status: 500,
      };
    }
    return {
      message: error,
      status: 500,
    };
  }

  // Unknown error type
  if (isProduction) {
    return {
      message: "An unexpected error occurred",
      status: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    status: 500,
    details: error,
  };
}

/**
 * Get HTTP status code for known error types
 */
function getStatusForError(errorMessage: string): number {
  switch (errorMessage) {
    case "UNAUTHORIZED":
      return 401;
    case "TENANT_NOT_FOUND":
      return 400;
    case "USER_NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    default:
      return 500;
  }
}

/**
 * Create a sanitized error response
 * Logs full error details server-side, returns sanitized message to client
 */
export function createErrorResponse(error: unknown, defaultStatus: number = 500): NextResponse {
  const sanitized = sanitizeError(error);

  // Always log full error details server-side for debugging
  console.error("API Error:", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    details: error,
    sanitizedMessage: sanitized.message,
    status: sanitized.status,
  });

  return NextResponse.json(
    {
      error: sanitized.message,
      ...(process.env.NODE_ENV !== "production" && sanitized.details
        ? { details: sanitized.details }
        : {}),
    },
    { status: sanitized.status }
  );
}

/**
 * Handle auth errors with sanitization
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof Error) {
    switch (error.message) {
      case "UNAUTHORIZED":
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      case "TENANT_NOT_FOUND":
        return NextResponse.json(
          { error: "Tenant context not found" },
          { status: 400 }
        );
      case "USER_NOT_FOUND":
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      case "FORBIDDEN":
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // For unknown auth errors, use sanitized error handler
  return createErrorResponse(error, 500);
}

