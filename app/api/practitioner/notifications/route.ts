import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import NotificationJob from "@/lib/services/notification-queue";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import Practitioner from "@/lib/models/Practitioner";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";

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

    // Find the practitioner record for the authenticated user
    const practitioner = await Practitioner.findOne({ userId: authContext.userId });
    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    // Build query for authorization grants created by this practitioner
    const grantQuery: any = {
      requestingPractitionerId: practitioner._id,
    };

    if (organizationId) {
      grantQuery.organizationId = organizationId;
    }

    if (status && ["PENDING", "ACTIVE", "EXPIRED", "REVOKED"].includes(status)) {
      grantQuery["grantDetails.status"] = status;
    }

    // Fetch authorization grants and populate related data
    const grants = await AuthorizationGrant.find(grantQuery)
      .populate("userId", "personalInfo.firstName personalInfo.lastName digitalIdentifier")
      .populate("organizationId", "organizationInfo.name organizationInfo.type")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Also fetch notification jobs related to these grants
    const grantIds = grants.map((grant) => grant._id);
    const notifications = await NotificationJob.find({
      "payload.data.grantId": { $in: grantIds },
      "payload.data.requestingPractitionerId": practitioner._id.toString(),
    })
      .sort({ scheduledAt: -1 })
      .lean();

    // Transform grants for frontend
    const transformedGrants = grants.map((grant: any) => ({
      grantId: grant._id,
      patient: {
        name: `${grant.userId.personalInfo.firstName} ${grant.userId.personalInfo.lastName}`,
        digitalIdentifier: grant.userId.digitalIdentifier,
      },
      organization: grant.organizationId,
      status: grant.grantDetails.status,
      accessScope: grant.accessScope,
      createdAt: grant.auditCreatedDateTime,
      expiresAt: grant.grantDetails.expiresAt,
      grantedAt: grant.grantDetails.grantedAt,
      timeWindowHours: grant.grantDetails.timeWindowHours,
    }));

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
        grants: transformedGrants,
        notifications: transformedNotifications,
        total: transformedGrants.length,
      },
    });
  } catch (error) {
    console.error("Error fetching practitioner notifications:", error);
    return NextResponse.json({ error: "Failed to fetch practitioner notifications" }, { status: 500 });
  }
}

/**
 * GET /api/practitioner/pending-requests
 * Get pending authorization requests for a specific organization
 * Query params: organizationId (required)
 */
async function getPendingRequestsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    // Find pending grants for the organization
    const grants = await AuthorizationGrant.find({
      organizationId: organizationId,
      "grantDetails.status": "PENDING",
      "grantDetails.expiresAt": { $gt: new Date() },
    })
      .populate("userId", "personalInfo.firstName personalInfo.lastName digitalIdentifier")
      .populate({
        path: "requestingPractitionerId",
        select: "userId professionalInfo.practitionerType",
        populate: {
          path: "userId",
          select: "personalInfo.firstName personalInfo.lastName",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform for frontend
    const transformedGrants = grants.map((grant: any) => ({
      grantId: grant._id,
      patient: {
        name: `${grant.userId.personalInfo.firstName} ${grant.userId.personalInfo.lastName}`,
        digitalIdentifier: grant.userId.digitalIdentifier,
      },
      requester: grant.requestingPractitionerId
        ? {
            name: `${grant.requestingPractitionerId.userId.personalInfo.firstName} ${grant.requestingPractitionerId.userId.personalInfo.lastName}`,
            type: grant.requestingPractitionerId.professionalInfo.practitionerType,
          }
        : null,
      accessScope: grant.accessScope,
      createdAt: grant.auditCreatedDateTime,
      expiresAt: grant.grantDetails.expiresAt,
      timeWindowHours: grant.grantDetails.timeWindowHours,
    }));

    return NextResponse.json({
      success: true,
      data: transformedGrants,
      total: transformedGrants.length,
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return NextResponse.json({ error: "Failed to fetch pending requests" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPractitionerNotificationsHandler);
