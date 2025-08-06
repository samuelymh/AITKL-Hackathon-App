import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import NotificationJob from "@/lib/services/notification-queue";
import Practitioner from "@/lib/models/Practitioner";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getAuthorizationGrantsForPractitioner } from "@/lib/services/authorization-service";

/**
 * GET /api/practitioner/notifications
 * Get notifications for practitioners - authorization requests they created
 * Query params: organizationId (optional), status (optional), limit (optional, default 20)
 */
async function getPractitionerNotificationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    // Validate status parameter
    if (status && !["PENDING", "ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status parameter" }, { status: 400 });
    }

    // Find the practitioner record for the authenticated user
    const practitioner = await Practitioner.findOne({ userId: authContext.userId });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    // Use the optimized service function to get grants
    const grants = await getAuthorizationGrantsForPractitioner({
      requestingPractitionerId: practitioner._id.toString(),
      organizationId: organizationId || undefined,
      status: status || undefined,
      includeExpired: false,
    });

    // Limit the results
    const limitedGrants = grants.slice(0, limit);

    // Fetch notification jobs related to these grants
    const grantIds = limitedGrants.map((grant) => grant.grantId);
    const notifications =
      grantIds.length > 0
        ? await NotificationJob.find({
            "payload.data.grantId": { $in: grantIds },
            "payload.data.requestingPractitionerId": practitioner._id.toString(),
          })
            .sort({ scheduledAt: -1 })
            .lean()
        : [];

    // Transform notifications for frontend
    const transformedNotifications = notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      status: notification.status,
      priority: notification.priority,
      title: notification.payload.title,
      body: notification.payload.body,
      data: notification.payload.data,
      createdAt: notification.scheduledAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        grants: limitedGrants,
        notifications: transformedNotifications,
        total: limitedGrants.length,
      },
    });
  } catch (error) {
    console.error("Error fetching practitioner notifications:", error);
    return NextResponse.json({ error: "Failed to fetch practitioner notifications" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPractitionerNotificationsHandler);
