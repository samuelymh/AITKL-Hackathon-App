import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { NotificationJobStatus } from "@/lib/services/notification-queue";
import { withAnyAuth } from "@/lib/middleware/auth";
import {
  getNotificationsForUser,
  markNotificationCompleted,
} from "@/lib/services/notification-service";

/**
 * GET /api/notifications
 * Get notifications for the authenticated user (for patient dashboard)
 * Query params: status (optional), limit (optional, default 20)
 */
async function getNotificationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate status parameter
    if (
      status &&
      !Object.values(NotificationJobStatus).includes(
        status as NotificationJobStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid status parameter" },
        { status: 400 },
      );
    }

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    // Use the optimized service function
    const notifications = await getNotificationsForUser(authContext.userId, {
      status: status || undefined,
      limit,
      includeGrantDetails: true,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notification as read/processed
 */
async function patchNotificationsHandler(
  request: NextRequest,
  authContext: any,
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, status } = body;

    if (!notificationId || !status) {
      return NextResponse.json(
        { error: "Missing notificationId or status" },
        { status: 400 },
      );
    }

    // Validate status
    if (!Object.values(NotificationJobStatus).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 },
      );
    }

    // Use the optimized service function for marking as completed
    if (status === NotificationJobStatus.COMPLETED) {
      const success = await markNotificationCompleted(
        notificationId,
        authContext.userId,
      );

      if (!success) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }
    } else {
      // For other status updates, use the direct database update
      const NotificationJob = (
        await import("@/lib/services/notification-queue")
      ).default;

      const notification = await NotificationJob.findOneAndUpdate(
        {
          _id: notificationId,
          userId: authContext.userId,
        },
        {
          status: status,
          completedAt:
            status === NotificationJobStatus.COMPLETED ? new Date() : undefined,
        },
        { new: true },
      );

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const GET = withAnyAuth(getNotificationsHandler);
export const PATCH = withAnyAuth(patchNotificationsHandler);
