/**
 * Notification Queue Processing API
 * Processes pending notification jobs
 * This endpoint can be called by Vercel cron jobs or external schedulers
 */

import { NextRequest, NextResponse } from "next/server";
import { PushNotificationService } from "@/lib/services/push-notification-service";
import { getClientIP } from "@/lib/utils/network";

/**
 * POST /api/admin/queue/process
 * Process pending notification jobs
 *
 * This endpoint should be secured and only accessible by:
 * - Admin users
 * - Cron job services
 * - Internal services with proper authentication
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📋 Queue processing request from IP: ${clientIP}`);

    // Parse request body for batch size
    let batchSize = 10; // Default batch size
    try {
      const body = await request.json();
      if (body.batchSize && typeof body.batchSize === "number" && body.batchSize > 0 && body.batchSize <= 100) {
        batchSize = body.batchSize;
      }
    } catch {
      // Use default if body parsing fails
    }

    // Process pending notifications
    const result = await PushNotificationService.processPendingNotifications(batchSize);

    return NextResponse.json({
      success: true,
      data: {
        batchSize,
        ...result,
        processedAt: new Date().toISOString(),
      },
      message:
        result.succeeded > 0
          ? `Successfully processed ${result.succeeded} notifications`
          : "No notifications to process",
    });
  } catch (error) {
    console.error("Error processing notification queue:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process notification queue",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/queue/process
 * Get queue processing status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📊 Queue stats request from IP: ${clientIP}`);

    // Get queue statistics
    const stats = await PushNotificationService.getQueueStats();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting queue stats:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get queue statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
