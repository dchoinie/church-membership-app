import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Preserves basic formatting but removes dangerous scripts and attributes
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text - removes all HTML tags and scripts
 * Use for fields like names, addresses, etc. where HTML is not needed
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";

  // Remove HTML tags and decode entities
  const stripped = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  // Trim whitespace
  return stripped.trim();
}

/**
 * Sanitize email address - basic validation and sanitization
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "";

  // Remove HTML tags and trim
  const sanitized = sanitizeText(email);

  // Basic email validation (will be validated more strictly elsewhere)
  // Just ensure no dangerous characters
  return sanitized.toLowerCase().trim();
}

/**
 * Sanitize a URL - ensures it's safe
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";

  const sanitized = sanitizeText(url);

  // Only allow http/https URLs
  if (sanitized && !sanitized.match(/^https?:\/\//i)) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize an object's string properties
 * Recursively sanitizes all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    allowHtml?: boolean;
    excludeKeys?: string[];
  } = {}
): T {
  const { allowHtml = false, excludeKeys = [] } = options;

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (excludeKeys.includes(key)) {
      continue;
    }

    const value = sanitized[key];

    if (typeof value === "string") {
      sanitized[key] = allowHtml ? sanitizeHtml(value) : sanitizeText(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? allowHtml
            ? sanitizeHtml(item)
            : sanitizeText(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item, options)
          : item
      );
    }
  }

  return sanitized;
}

