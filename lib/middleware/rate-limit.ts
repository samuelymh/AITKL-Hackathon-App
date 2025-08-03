import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/api-helpers";

// In-memory rate limiting store (for production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig,
) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests, please try again later",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = config;

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get client identifier (IP address)
      const clientId = getClientId(request);
      const now = Date.now();
      const resetTime = now + windowMs;

      // Get or create rate limit entry
      let rateLimitEntry = rateLimitStore.get(clientId);

      if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
        // Reset window
        rateLimitEntry = { count: 0, resetTime };
        rateLimitStore.set(clientId, rateLimitEntry);
      }

      // Check if limit exceeded
      if (rateLimitEntry.count >= maxRequests) {
        return createErrorResponse(
          message,
          429, // Too Many Requests
        );
      }

      // Increment counter
      rateLimitEntry.count++;

      // Execute handler
      const response = await handler(request);

      // Conditionally count the request based on success/failure
      const shouldCount =
        (!skipSuccessfulRequests || response.status >= 400) &&
        (!skipFailedRequests || response.status < 400);

      if (!shouldCount) {
        rateLimitEntry.count--;
      }

      // Add rate limit headers
      const headers = new Headers(response.headers);
      headers.set("X-RateLimit-Limit", maxRequests.toString());
      headers.set(
        "X-RateLimit-Remaining",
        Math.max(0, maxRequests - rateLimitEntry.count).toString(),
      );
      headers.set(
        "X-RateLimit-Reset",
        new Date(rateLimitEntry.resetTime).toISOString(),
      );

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Don't block requests on rate limiting errors
      return await handler(request);
    }
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip =
    cfConnectingIp || realIp || forwardedFor?.split(",")[0] || "unknown";

  // Include user agent for better identification (truncated to avoid long keys)
  const userAgent =
    request.headers.get("user-agent")?.substring(0, 50) || "unknown";

  return `${ip}-${userAgent}`;
}

/**
 * Clean up expired entries periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // Very strict for auth endpoints
  AUTH_STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: "Too many authentication attempts, please try again in 15 minutes",
    skipSuccessfulRequests: true,
  },

  // Moderate for general auth
  AUTH_MODERATE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    message: "Too many requests, please try again later",
  },

  // General API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: "Rate limit exceeded, please slow down",
  },

  // Public endpoints
  PUBLIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: "Too many requests, please try again later",
  },
} as const;
