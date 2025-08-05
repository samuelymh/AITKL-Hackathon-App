import { NextRequest, NextResponse } from "next/server";
import { getClientIP } from "@/lib/utils/network";
import { getAuthContext } from "@/lib/auth";

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  role?: string;
  statusCode: number;
  responseTime: number;
  error?: string;
}

/**
 * Request logging middleware for API routes
 * Logs all requests with user context and performance metrics
 */
export function withLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
  } = {}
) {
  const { logRequests = true, logResponses = true, logErrors = true } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;
    let error: Error | null = null;

    try {
      // Extract user context
      const authContext = getAuthContext(request);

      // Log incoming request
      if (logRequests) {
        const requestLog: Partial<LogEntry> = {
          timestamp: new Date().toISOString(),
          method: request.method,
          url: request.url,
          userAgent: request.headers.get("user-agent") || "unknown",
          ip: getClientIP(request),
          userId: authContext?.userId,
          role: authContext?.role,
        };

        console.log("[REQUEST]", JSON.stringify(requestLog));
      }

      // Execute handler
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));

      // Create error response
      response = NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Log response
    if (logResponses || (logErrors && response.status >= 400)) {
      const authContext = getAuthContext(request);

      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        userAgent: request.headers.get("user-agent") || "unknown",
        ip: getClientIP(request),
        userId: authContext?.userId,
        role: authContext?.role,
        statusCode: response.status,
        responseTime,
        error: error?.message,
      };

      const logLevel = response.status >= 400 ? "[ERROR]" : "[RESPONSE]";
      console.log(logLevel, JSON.stringify(logEntry));

      // Store in audit log for important operations
      if (shouldAuditLog(request, response)) {
        await storeAuditLog(logEntry);
      }
    }

    return response;
  };
}

/**
 * Determine if request should be stored in audit log
 */
function shouldAuditLog(request: NextRequest, response: NextResponse): boolean {
  const url = request.url;
  const method = request.method;

  // Audit authentication operations
  if (url.includes("/api/auth/")) {
    return true;
  }

  // Audit user management operations
  if (url.includes("/api/users/") && ["POST", "PUT", "DELETE"].includes(method)) {
    return true;
  }

  // Audit prescription operations
  if (url.includes("/api/prescriptions/") && ["POST", "PUT", "DELETE"].includes(method)) {
    return true;
  }

  // Audit medical records operations
  if (url.includes("/api/medical-records/") && ["POST", "PUT", "DELETE"].includes(method)) {
    return true;
  }

  // Audit all error responses
  if (response.status >= 400) {
    return true;
  }

  return false;
}

/**
 * Store audit log entry (implement based on your storage preference)
 */
async function storeAuditLog(logEntry: LogEntry): Promise<void> {
  try {
    // In production, you might want to:
    // 1. Store in database audit table
    // 2. Send to external logging service (e.g., CloudWatch, ELK stack)
    // 3. Write to structured log files

    // For now, just enhanced console logging with structured format
    console.log(
      "[AUDIT]",
      JSON.stringify({
        ...logEntry,
        category: "AUDIT",
        severity: logEntry.statusCode >= 400 ? "ERROR" : "INFO",
      })
    );

    // TODO: Implement database storage
    // await AuditLog.create(logEntry);
  } catch (error) {
    console.error("Failed to store audit log:", error);
    // Don't throw - logging failures shouldn't break the request
  }
}

/**
 * Security-focused logging for sensitive operations
 */
export function withSecurityLogging(handler: (request: NextRequest) => Promise<NextResponse>) {
  return withLogging(handler, {
    logRequests: true,
    logResponses: true,
    logErrors: true,
  });
}

/**
 * Performance-focused logging for monitoring
 */
export function withPerformanceLogging(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    const response = await withLogging(handler, {
      logRequests: false,
      logResponses: true,
      logErrors: true,
    })(request);

    const responseTime = Date.now() - startTime;

    // Log slow requests
    if (responseTime > 1000) {
      console.warn(
        "[SLOW_REQUEST]",
        JSON.stringify({
          url: request.url,
          method: request.method,
          responseTime,
          timestamp: new Date().toISOString(),
        })
      );
    }

    return response;
  };
}
