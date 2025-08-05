import { NextRequest, NextResponse } from "next/server";

/**
 * Basic error handling middleware
 */
export function withErrorHandling(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error("Error in API handler:", error);
      
      return NextResponse.json(
        {
          error: "Internal server error",
          message: process.env.NODE_ENV === "development" 
            ? (error as Error).message 
            : "An unexpected error occurred"
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Async error handling middleware for better error tracking
 */
export function withAsyncErrorHandling(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args);
      return result;
    } catch (error) {
      console.error("Async error in API handler:", error);
      
      // Log error details for monitoring
      if (process.env.NODE_ENV === "production") {
        // In production, you might want to send to error tracking service
        // e.g., Sentry, LogRocket, etc.
      }
      
      return NextResponse.json(
        {
          error: "Internal server error",
          message: process.env.NODE_ENV === "development" 
            ? (error as Error).message 
            : "An unexpected error occurred",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}