/**
 * Notification Queue Cleanup API
 * Cleans up old processed notification jobs with enhanced security
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PushNotificationService } from "@/lib/services/push-notification-service";
import { getAuthContext, requireAuth, UserRole } from "@/lib/auth";
import { getClientIP } from "@/lib/utils/network";

// Validation schema for cleanup request
const QueueCleanupSchema = z.object({
  olderThanHours: z.number().int().positive().max(168).default(24).optional(), // Max 1 week
});

// Admin API key for cron jobs and external services
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const CRON_API_KEY = process.env.CRON_API_KEY;

/**
 * Authentication middleware for queue cleanup
 * Same pattern as the process endpoint
 */
function authenticateCleanupRequest(request: NextRequest):
  | {
      success: true;
      authType: "admin" | "api_key" | "cron";
      userId: string;
    }
  | {
      success: false;
      error: string;
      status: number;
    } {
  const clientIP = getClientIP(request);

  // Check for API key authentication (for cron jobs and external services)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    if (apiKey === ADMIN_API_KEY && ADMIN_API_KEY) {
      console.log(`🔑 Admin API key authentication successful from IP: ${clientIP}`);
      return { success: true, authType: "api_key", userId: "admin-api-key" };
    }
    if (apiKey === CRON_API_KEY && CRON_API_KEY) {
      console.log(`⏰ Cron API key authentication successful from IP: ${clientIP}`);
      return { success: true, authType: "cron", userId: "cron-service" };
    }

    console.warn(`🚫 Invalid API key provided from IP: ${clientIP}`);
    return { success: false, error: "Invalid API key", status: 401 };
  }

  // Check for JWT admin authentication
  const authContext = getAuthContext(request);
  const authCheck = requireAuth([UserRole.ADMIN]);
  const authResult = authCheck(authContext);

  if (!authResult.success) {
    console.warn(`🚫 Admin authentication failed from IP: ${clientIP} - ${authResult.error}`);
    return {
      success: false,
      error: authResult.error || "Authentication required",
      status: authResult.status || 401,
    };
  }

  console.log(`👤 Admin JWT authentication successful from IP: ${clientIP} (User: ${authContext?.userId})`);
  return {
    success: true,
    authType: "admin",
    userId: authContext?.userId || "unknown-admin",
  };
}

/**
 * POST /api/admin/queue/cleanup
 * Clean up old notification jobs with authentication and validation
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`🧹 Queue cleanup request received from IP: ${clientIP}`);

    // Authenticate the request
    const authResult = authenticateCleanupRequest(request);
    if (!authResult.success) {
      console.error(`🚫 Authentication failed: ${authResult.error}`);
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          timestamp: new Date().toISOString(),
        },
        { status: authResult.status }
      );
    }

    console.log(`✅ Authentication successful - Type: ${authResult.authType}, User: ${authResult.userId}`);

    // Parse and validate request body
    let olderThanHours = 24; // Default: cleanup jobs older than 24 hours
    try {
      const body = await request.json();
      const validatedBody = QueueCleanupSchema.parse(body);
      olderThanHours = validatedBody.olderThanHours ?? 24;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("🚫 Request validation failed:", error.errors);
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request body",
            details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
      // If JSON parsing fails, use default
      console.warn("⚠️ Failed to parse request body, using default cleanup age");
    }

    // Validate olderThanHours bounds
    if (olderThanHours < 1 || olderThanHours > 168) {
      return NextResponse.json(
        {
          success: false,
          error: "olderThanHours must be between 1 and 168 (1 week)",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ Cleaning up jobs older than ${olderThanHours} hours`);

    // Clean up old jobs
    const deletedCount = await PushNotificationService.cleanupOldJobs(olderThanHours);

    console.log(`✅ Cleanup completed - Deleted ${deletedCount} old jobs`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        olderThanHours,
        cleanupAt: new Date().toISOString(),
        cleanupBy: authResult.userId,
        authType: authResult.authType,
      },
      message: deletedCount > 0 ? `Cleaned up ${deletedCount} old notification jobs` : "No old jobs to clean up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error cleaning up notification queue:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to cleanup notification queue",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/queue/cleanup
 * Get information about cleanup-eligible jobs with authentication
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📊 Cleanup info request received from IP: ${clientIP}`);

    // Authenticate the request
    const authResult = authenticateCleanupRequest(request);
    if (!authResult.success) {
      console.error(`🚫 Authentication failed: ${authResult.error}`);
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          timestamp: new Date().toISOString(),
        },
        { status: authResult.status }
      );
    }

    console.log(`✅ Authentication successful - Type: ${authResult.authType}, User: ${authResult.userId}`);

    // Get current queue statistics (to show what would be cleaned)
    const stats = await PushNotificationService.getQueueStats();

    // Determine cleanup recommendation reason
    let cleanupReason: string;
    if (stats.completed > 100) {
      cleanupReason = "High number of completed jobs";
    } else if (stats.failed > 50) {
      cleanupReason = "High number of failed jobs";
    } else {
      cleanupReason = "Normal job levels";
    }

    return NextResponse.json({
      success: true,
      data: {
        currentStats: stats,
        cleanupRecommendation: {
          suggested: stats.completed > 100 || stats.failed > 50,
          reason: cleanupReason,
        },
        timestamp: new Date().toISOString(),
        retrievedBy: authResult.userId,
        authType: authResult.authType,
      },
    });
  } catch (error) {
    console.error("Error getting cleanup info:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get cleanup information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
