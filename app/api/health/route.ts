import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/mongodb";
import { executeDatabaseOperation } from "@/lib/db-utils";

/**
 * Health check endpoint for MongoDB connection
 * GET /api/health - Returns database connection status and health metrics
 */
export async function GET() {
  try {
    const healthCheck = await executeDatabaseOperation(
      () => checkDatabaseHealth(),
      "Database Health Check",
    );

    if (!healthCheck.success) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date(),
          error: healthCheck.error,
          details: {
            message: "Database health check failed",
            service: "MongoDB",
          },
        },
        { status: 503 },
      );
    }

    const health = healthCheck.data!;
    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(
      {
        ...health,
        service: "MongoDB",
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
      { status: statusCode },
    );
  } catch (error) {
    console.error("Health check endpoint error:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          message: "Health check endpoint encountered an error",
          service: "MongoDB",
        },
      },
      { status: 503 },
    );
  }
}
