import { NextRequest, NextResponse } from "next/server";
import { withAuth, withOptionalAuth } from "./auth";
import { withRateLimit } from "./rate-limit";
import {
  withLogging,
  withSecurityLogging,
  withPerformanceLogging,
} from "./logging";
import { withErrorHandling, withAsyncErrorHandling } from "./error-handling";
import { UserRole } from "@/lib/auth";

/**
 * Middleware composer for API routes
 * Combines multiple middleware functions in the correct order
 */
export function composeMiddleware(
  handler: (request: NextRequest, authContext?: any) => Promise<NextResponse>,
  options: {
    // Authentication
    requireAuth?: boolean;
    allowedRoles?: UserRole[];

    // Rate limiting
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
      message?: string;
    };

    // Logging
    enableLogging?: boolean;
    enableSecurityLogging?: boolean;
    enablePerformanceLogging?: boolean;

    // Error handling
    enableErrorHandling?: boolean;
  } = {},
) {
  const {
    requireAuth = false,
    allowedRoles,
    rateLimit,
    enableLogging = true,
    enableSecurityLogging = false,
    enablePerformanceLogging = false,
    enableErrorHandling = true,
  } = options;

  let composedHandler = handler;

  // Apply auth middleware
  if (requireAuth) {
    composedHandler = withAuth(composedHandler, {
      allowedRoles,
      requireAuth: true,
    });
  } else if (allowedRoles) {
    composedHandler = withOptionalAuth(composedHandler);
  }

  // Apply rate limiting
  if (rateLimit) {
    composedHandler = withRateLimit(composedHandler, rateLimit);
  }

  // Apply logging (order matters - more specific first)
  if (enableSecurityLogging) {
    composedHandler = withSecurityLogging(composedHandler);
  } else if (enablePerformanceLogging) {
    composedHandler = withPerformanceLogging(composedHandler);
  } else if (enableLogging) {
    composedHandler = withLogging(composedHandler);
  }

  // Apply error handling (outermost layer)
  if (enableErrorHandling) {
    composedHandler = withAsyncErrorHandling(
      withErrorHandling(composedHandler),
    );
  }

  return composedHandler;
}

/**
 * Pre-configured middleware combinations for common use cases
 */

// Public API endpoints
export const publicApiMiddleware = (
  handler: (request: NextRequest) => Promise<NextResponse>,
) =>
  composeMiddleware(handler, {
    requireAuth: false,
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    enableLogging: true,
    enableErrorHandling: true,
  });

// Authenticated API endpoints
export const authenticatedApiMiddleware = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
  allowedRoles?: UserRole[],
) =>
  composeMiddleware(handler, {
    requireAuth: true,
    allowedRoles,
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
    },
    enableLogging: true,
    enableErrorHandling: true,
  });

// Authentication endpoints (login, register, etc.)
export const authEndpointMiddleware = (
  handler: (request: NextRequest) => Promise<NextResponse>,
) =>
  composeMiddleware(handler, {
    requireAuth: false,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      message: "Too many authentication attempts, please try again later",
    },
    enableSecurityLogging: true,
    enableErrorHandling: true,
  });

// Admin-only endpoints
export const adminApiMiddleware = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) =>
  composeMiddleware(handler, {
    requireAuth: true,
    allowedRoles: [UserRole.ADMIN],
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 500, // Higher limit for admins
    },
    enableSecurityLogging: true,
    enableErrorHandling: true,
  });

// Medical staff endpoints (doctors, pharmacists)
export const medicalStaffApiMiddleware = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) =>
  composeMiddleware(handler, {
    requireAuth: true,
    allowedRoles: [UserRole.DOCTOR, UserRole.PHARMACIST, UserRole.ADMIN],
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 300,
    },
    enableLogging: true,
    enablePerformanceLogging: true,
    enableErrorHandling: true,
  });

// High-security endpoints (prescription management, medical records)
export const highSecurityApiMiddleware = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
  allowedRoles?: UserRole[],
) =>
  composeMiddleware(handler, {
    requireAuth: true,
    allowedRoles,
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // Lower limit for security
    },
    enableSecurityLogging: true,
    enablePerformanceLogging: true,
    enableErrorHandling: true,
  });

/**
 * Utility function to create a simple authenticated route
 */
export function createAuthenticatedRoute(
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
  allowedRoles?: UserRole[],
) {
  return authenticatedApiMiddleware(handler, allowedRoles);
}

/**
 * Utility function to create a public route
 */
export function createPublicRoute(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return publicApiMiddleware(handler);
}
