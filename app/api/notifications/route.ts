import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import NotificationJob, { NotificationJobStatus } from "@/lib/services/notification-queue";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAnyAuth } from "@/lib/middleware/auth";

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

    // Build query
    const query: any = {
      userId: authContext.userId,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    };

    if (status && Object.values(NotificationJobStatus).includes(status as NotificationJobStatus)) {
      query.status = status;
    }

    // Fetch notification jobs
    const notifications = await NotificationJob.find(query).sort({ scheduledAt: -1 }).limit(limit).lean();

    // Transform for frontend
    const transformedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let additionalData = {};

        // If it's an authorization request, fetch the grant details
        if (notification.payload.data?.grantId) {
          try {
            const grant = await AuthorizationGrant.findById(notification.payload.data.grantId)
              .populate("organizationId", "organizationInfo.name organizationInfo.type")
              .populate({
                path: "requestingPractitionerId",
                select: "userId professionalInfo.practitionerType",
                populate: {
                  path: "userId",
                  select: "personalInfo.firstName personalInfo.lastName",
                },
              })
              .lean();

            if (grant) {
              additionalData = {
                grantStatus: grant.grantDetails.status,
                expiresAt: grant.grantDetails.expiresAt,
                accessScope: grant.accessScope,
                organization: grant.organizationId,
                practitioner: grant.requestingPractitionerId,
              };
            }
          } catch (error) {
            console.error("Error fetching grant details:", error);
          }
        }

        return {
          id: notification._id,
          type: notification.type,
          status: notification.status,
          priority: notification.priority,
          title: notification.payload.title,
          body: notification.payload.body,
          data: notification.payload.data,
          createdAt: notification.scheduledAt,
          ...additionalData,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: transformedNotifications,
      total: transformedNotifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notification as read/processed
 */
async function patchNotificationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, status } = body;

    if (!notificationId || !status) {
      return NextResponse.json({ error: "Missing notificationId or status" }, { status: 400 });
    }

    // Update notification status
    const notification = await NotificationJob.findOneAndUpdate(
      {
        _id: notificationId,
        userId: authContext.userId,
      },
      {
        status: status,
        completedAt: status === NotificationJobStatus.COMPLETED ? new Date() : undefined,
      },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withAnyAuth(getNotificationsHandler);
export const PATCH = withAnyAuth(patchNotificationsHandler);
