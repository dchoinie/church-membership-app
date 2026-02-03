// Don't import DOMPurify at top level - it requires jsdom which fails in serverless environments
// Import it dynamically only when needed

/**
 * Lightweight sanitize plain text - removes HTML tags without requiring jsdom
 * Use for fields like names, addresses, etc. where HTML is not needed
 * This version doesn't require jsdom, making it safe for serverless environments
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";

  // Simple regex-based HTML tag removal (faster and doesn't require jsdom)
  // This is sufficient for plain text fields where HTML should never be present
  const stripped = text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&[#\w]+;/g, "") // Remove HTML entities (basic)
    .trim();

  return stripped;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Preserves basic formatting but removes dangerous scripts and attributes
 * Uses DOMPurify dynamically to avoid loading jsdom unless needed
 * Note: This is async because DOMPurify is loaded dynamically
 */
export async function sanitizeHtml(html: string | null | undefined): Promise<string> {
  if (!html) return "";

  // Dynamically import DOMPurify only when needed
  const DOMPurify = (await import("isomorphic-dompurify")).default;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href"],
    ALLOW_DATA_ATTR: false,
  });
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
 * Note: If allowHtml is true, this becomes async and returns a Promise
 */
export async function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    allowHtml?: boolean;
    excludeKeys?: string[];
  } = {}
): Promise<T> {
  const { allowHtml = false, excludeKeys = [] } = options;

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (excludeKeys.includes(key)) {
      continue;
    }

    const value = sanitized[key];

    if (typeof value === "string") {
      (sanitized as any)[key] = allowHtml ? await sanitizeHtml(value) : sanitizeText(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      (sanitized as any)[key] = await sanitizeObject(value, options);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = await Promise.all(
        value.map(async (item: any) =>
          typeof item === "string"
            ? allowHtml
              ? await sanitizeHtml(item)
              : sanitizeText(item)
            : typeof item === "object" && item !== null
            ? await sanitizeObject(item, options)
            : item
        )
      );
    }
  }

  return sanitized;
}
