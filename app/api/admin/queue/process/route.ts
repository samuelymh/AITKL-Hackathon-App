/**
 * Notification Queue Processing API
 * Processes pending notification jobs
 * This endpoint is secured and accessible to:
 * - Admin users with valid JWT tokens
 * - Cron job services with valid API keys
 * - Internal services with proper authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PushNotificationService } from "@/lib/services/push-notification-service";
import { getAuthContext, requireAuth, UserRole } from "@/lib/auth";
import { getClientIP } from "@/lib/utils/network";

// Validation schema for queue processing request
const QueueProcessSchema = z.object({
  batchSize: z.number().int().positive().max(100).default(10).optional(),
});

// Admin API key for cron jobs and external services
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const CRON_API_KEY = process.env.CRON_API_KEY;

/**
 * Authentication middleware specifically for queue processing
 * Supports both JWT admin auth and API key auth for automation
 */
function authenticateQueueRequest(request: NextRequest):
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
 * POST /api/admin/queue/process
 * Process pending notification jobs with enhanced security and validation
 *
 * Authentication methods supported:
 * 1. Admin JWT token in Authorization header
 * 2. Admin API key in x-api-key header
 * 3. Cron service API key in x-api-key header
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📋 Queue processing request received from IP: ${clientIP}`);

    // Authenticate the request
    const authResult = authenticateQueueRequest(request);
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
    let batchSize = 10; // Default batch size
    try {
      const body = await request.json();
      const validatedBody = QueueProcessSchema.parse(body);
      batchSize = validatedBody.batchSize ?? 10;
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
      // If JSON parsing fails, use default batch size
      console.warn("⚠️ Failed to parse request body, using default batch size");
    }

    // Validate batch size bounds
    if (batchSize < 1 || batchSize > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch size must be between 1 and 100",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing notification queue with batch size: ${batchSize}`);

    // Process pending notifications
    const result = await PushNotificationService.processPendingNotifications(batchSize);

    // Log successful processing
    console.log(`✅ Queue processing completed - Succeeded: ${result.succeeded}, Failed: ${result.failed}`);

    const response = {
      success: true,
      data: {
        batchSize,
        ...result,
        processedAt: new Date().toISOString(),
        processedBy: authResult.userId,
        authType: authResult.authType,
      },
      message:
        result.succeeded > 0
          ? `Successfully processed ${result.succeeded} notifications`
          : "No notifications to process",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("💥 Error processing notification queue:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process notification queue",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/queue/process
 * Get queue processing status and statistics with authentication
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📊 Queue stats request received from IP: ${clientIP}`);

    // Authenticate the request
    const authResult = authenticateQueueRequest(request);
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

    // Get queue statistics
    const stats = await PushNotificationService.getQueueStats();

    console.log(`📈 Queue stats retrieved: ${JSON.stringify(stats)}`);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString(),
        retrievedBy: authResult.userId,
        authType: authResult.authType,
      },
    });
  } catch (error) {
    console.error("💥 Error getting queue stats:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get queue statistics",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
