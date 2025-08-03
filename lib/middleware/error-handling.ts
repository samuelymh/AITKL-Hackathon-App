import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createErrorResponse } from "@/lib/api-helpers";

/**
 * Global error handling middleware for API routes
 */
export function withErrorHandling(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("API Error:", error);
      return handleError(error, request);
    }
  };
}

/**
 * Handle different types of errors and return appropriate responses
 */
function handleError(error: unknown, request: NextRequest): NextResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    return createErrorResponse("Validation failed", 400, { validationErrors });
  }

  // MongoDB/Mongoose errors
  if (isMongoError(error)) {
    return handleMongoError(error as Error);
  }

  // JWT errors
  if (isJWTError(error)) {
    return createErrorResponse("Authentication failed", 401);
  }

  // Cast errors (usually from invalid ObjectIds)
  if (isCastError(error)) {
    return createErrorResponse("Invalid ID format", 400);
  }

  // Network/timeout errors
  if (isNetworkError(error)) {
    return createErrorResponse("Network error, please try again", 503);
  }

  // Rate limiting errors
  if (isRateLimitError(error)) {
    return createErrorResponse("Too many requests, please try again later", 429);
  }

  // Custom application errors
  if (error instanceof Error) {
    // Check for specific error messages that should return certain status codes
    if (error.message.includes("not found")) {
      return createErrorResponse(error.message, 404);
    }

    if (error.message.includes("unauthorized") || error.message.includes("forbidden")) {
      return createErrorResponse(error.message, 403);
    }

    if (error.message.includes("invalid") || error.message.includes("required")) {
      return createErrorResponse(error.message, 400);
    }
  }

  // Default server error
  return createErrorResponse(
    "Internal server error",
    500,
    process.env.NODE_ENV === "development"
      ? {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      : undefined
  );
}

/**
 * Check if error is a MongoDB/Mongoose error
 */
function isMongoError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "MongoError" ||
    error.name === "MongoServerError" ||
    error.name === "ValidationError" ||
    error.name === "CastError" ||
    error.message.includes("mongo") ||
    error.message.includes("mongoose")
  );
}

/**
 * Handle MongoDB-specific errors
 */
function handleMongoError(error: Error): NextResponse {
  // Duplicate key error
  if (error.message.includes("E11000") || error.message.includes("duplicate")) {
    return createErrorResponse("Resource already exists", 409);
  }

  // Validation error
  if (error.name === "ValidationError") {
    return createErrorResponse("Database validation failed", 400);
  }

  // Connection error
  if (error.message.includes("connection") || error.message.includes("timeout")) {
    return createErrorResponse("Database connection error", 503);
  }

  // Default mongo error
  return createErrorResponse("Database error", 500);
}

/**
 * Check if error is a JWT-related error
 */
function isJWTError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError" ||
    error.name === "NotBeforeError" ||
    error.message.includes("jwt") ||
    error.message.includes("token")
  );
}

/**
 * Check if error is a cast error (invalid ObjectId)
 */
function isCastError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "CastError";
}

/**
 * Check if error is a network-related error
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorWithCode = error as Error & { code?: string };

  return (
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("Network") ||
    errorWithCode.code === "ECONNREFUSED"
  );
}

/**
 * Check if error is a rate limiting error
 */
function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("rate limit") || error.message.includes("too many requests");
}

/**
 * Error boundary for async operations
 */
export async function safeAsyncOperation<T>(operation: () => Promise<T>, fallback?: T): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error("Safe async operation failed:", error);
    return fallback ?? null;
  }
}

/**
 * Middleware to catch unhandled promise rejections in API routes
 */
export function withAsyncErrorHandling(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return Promise.resolve(handler(request)).catch((error) => {
      console.error("Unhandled async error:", error);
      return handleError(error, request);
    });
  };
}
