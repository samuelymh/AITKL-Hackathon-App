import { NextRequest, NextResponse } from "next/server";
import { getConnectionStatus, isConnected } from "@/lib/mongodb";

/**
 * Middleware for API routes to log requests and database connection status
 */
export function createApiMiddleware() {
  return async function middleware(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Log incoming request
    console.log(`🔍 [${requestId}] ${request.method} ${request.url}`, {
      userAgent: request.headers.get("user-agent"),
      dbStatus: getConnectionStatus(),
      dbConnected: isConnected(),
      timestamp: new Date().toISOString(),
    });

    try {
      // Execute the API handler
      const response = await handler(request);

      const duration = Date.now() - startTime;
      const status = response.status;

      // Log successful response
      console.log(`✅ [${requestId}] ${status} ${request.method} ${request.url} - ${duration}ms`);

      // Add request ID and performance headers
      response.headers.set("X-Request-ID", requestId);
      response.headers.set("X-Response-Time", `${duration}ms`);
      response.headers.set("X-DB-Status", getConnectionStatus());

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error response
      console.error(`❌ [${requestId}] ERROR ${request.method} ${request.url} - ${duration}ms:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        dbStatus: getConnectionStatus(),
      });

      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: "Internal server error",
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: {
            "X-Request-ID": requestId,
            "X-Response-Time": `${duration}ms`,
            "X-DB-Status": getConnectionStatus(),
          },
        }
      );
    }
  };
}

/**
 * Helper function to wrap API route handlers with middleware
 */
export function withApiMiddleware(handler: (request: NextRequest) => Promise<NextResponse>) {
  const middleware = createApiMiddleware();
  return (request: NextRequest) => middleware(request, handler);
}
