import { SanitizationRule } from "@/lib/types/enums";

export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   * Simple implementation without external dependencies
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== "string") return "";

    // Basic HTML tag removal and entity encoding
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  /**
   * Sanitize and normalize text input
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== "string") return "";

    // Remove HTML tags and normalize whitespace
    return input
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, "") // Only allow valid email characters
      .trim();
  }

  /**
   * Sanitize phone number input
   */
  static sanitizePhone(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .replace(/[^0-9+\-\s()]/g, "") // Only allow phone number characters
      .trim();
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(input: string): string {
    if (!input || typeof input !== "string") return "";

    try {
      const url = new URL(input);
      // Only allow http and https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }
      return url.toString();
    } catch {
      return "";
    }
  }

  /**
   * Sanitize alphanumeric input
   */
  static sanitizeAlphanumeric(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .replace(/[^a-zA-Z0-9]/g, "") // Only allow alphanumeric characters
      .trim();
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumeric(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .replace(/[^0-9.-]/g, "") // Only allow numeric characters and decimal/negative
      .trim();
  }

  /**
   * Sanitize object with multiple fields using type-safe rules
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    sanitizationRules: Partial<Record<keyof T, SanitizationRule>>
  ): T {
    const sanitized = { ...obj } as any;

    for (const [key, rule] of Object.entries(sanitizationRules)) {
      if (key in sanitized && typeof sanitized[key] === "string") {
        switch (rule) {
          case SanitizationRule.TEXT:
            sanitized[key] = this.sanitizeText(sanitized[key]);
            break;
          case SanitizationRule.EMAIL:
            sanitized[key] = this.sanitizeEmail(sanitized[key]);
            break;
          case SanitizationRule.PHONE:
            sanitized[key] = this.sanitizePhone(sanitized[key]);
            break;
          case SanitizationRule.URL:
            sanitized[key] = this.sanitizeUrl(sanitized[key]);
            break;
          case SanitizationRule.HTML:
            sanitized[key] = this.sanitizeHtml(sanitized[key]);
            break;
          case SanitizationRule.ALPHANUMERIC:
            sanitized[key] = this.sanitizeAlphanumeric(sanitized[key]);
            break;
          case SanitizationRule.NUMERIC:
            sanitized[key] = this.sanitizeNumeric(sanitized[key]);
            break;
          case SanitizationRule.OBJECT_ID:
            sanitized[key] = this.sanitizeObjectId(sanitized[key]);
            break;
          default:
            // Unknown rule, keep original value
            break;
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize MongoDB ObjectId
   */
  static sanitizeObjectId(input: string): string {
    if (!input || typeof input !== "string") return "";

    // Check if it's a valid ObjectId format (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(input)) {
      return "";
    }

    return input.toLowerCase();
  }

  /**
   * Sanitize search query to prevent injection
   */
  static sanitizeSearchQuery(input: string): string {
    if (!input || typeof input !== "string") return "";

    return input
      .replace(/[{}[\]().*+?^$|\\]/g, "") // Remove regex special characters
      .replace(/\$/g, "") // Remove MongoDB operators
      .trim()
      .substring(0, 100); // Limit length
  }
}
