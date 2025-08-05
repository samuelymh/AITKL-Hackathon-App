/**
 * Network utility functions for handling IP addresses and network-related operations
 */

import { NextRequest } from "next/server";

/**
 * Securely extracts client IP address from request headers
 * Handles various proxy headers and validates the extracted IP
 *
 * @param request - NextRequest object
 * @returns The client IP address or "unknown" if not found
 */
export function getClientIP(request: NextRequest): string {
  // Check x-forwarded-for header (most common with load balancers/proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Get the first IP in the comma-separated list and validate it's not empty
    const firstIP = forwarded.split(",")[0].trim();
    if (firstIP) return firstIP;
  }

  // Check x-real-ip header (common with nginx)
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  // Check x-client-ip header (less common but still used)
  const clientIP = request.headers.get("x-client-ip");
  if (clientIP) return clientIP;

  // Fallback to unknown if no IP found
  return "unknown";
}

/**
 * Validates if an IP address is in a valid format
 * Supports both IPv4 and IPv6 addresses
 *
 * @param ip - IP address string to validate
 * @returns True if valid IP format, false otherwise
 */
export function isValidIP(ip: string): boolean {
  // IPv4 regex pattern
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex pattern (simplified)
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Checks if an IP address is a private/internal IP
 * Useful for security and logging purposes
 *
 * @param ip - IP address string to check
 * @returns True if private IP, false otherwise
 */
export function isPrivateIP(ip: string): boolean {
  if (!isValidIP(ip)) return false;

  // Private IPv4 ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // 127.0.0.0/8 (localhost)
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  return privateRanges.some((range) => range.test(ip));
}

/**
 * Gets user agent string from request headers
 *
 * @param request - NextRequest object
 * @returns User agent string or "unknown" if not found
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") || "unknown";
}

/**
 * Extracts request metadata for logging and audit purposes
 *
 * @param request - NextRequest object
 * @returns Object containing IP, user agent, and other metadata
 */
export function getRequestMetadata(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);

  return {
    ip,
    userAgent,
    isPrivateIP: isPrivateIP(ip),
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: {
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      acceptLanguage: request.headers.get("accept-language"),
    },
  };
}
