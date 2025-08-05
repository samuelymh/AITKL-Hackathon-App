/**
 * Notification Queue Cleanup API
 * Cleans up old processed notification jobs
 */

import { NextRequest, NextResponse } from "next/server";
import { PushNotificationService } from "@/lib/services/push-notification-service";
import { getClientIP } from "@/lib/utils/network";

/**
 * POST /api/admin/queue/cleanup
 * Clean up old notification jobs
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`🧹 Queue cleanup request from IP: ${clientIP}`);

    // Parse request body for cleanup options
    let olderThanHours = 24; // Default: cleanup jobs older than 24 hours
    try {
      const body = await request.json();
      if (body.olderThanHours && typeof body.olderThanHours === "number" && body.olderThanHours > 0) {
        olderThanHours = Math.min(body.olderThanHours, 168); // Max 1 week
      }
    } catch {
      // Use default if body parsing fails
    }

    // Clean up old jobs
    const deletedCount = await PushNotificationService.cleanupOldJobs(olderThanHours);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        olderThanHours,
        cleanupAt: new Date().toISOString(),
      },
      message: deletedCount > 0 ? `Cleaned up ${deletedCount} old notification jobs` : "No old jobs to clean up",
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
 * Get information about cleanup-eligible jobs
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    console.log(`📊 Cleanup info request from IP: ${clientIP}`);

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
