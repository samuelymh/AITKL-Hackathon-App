import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";

/**
 * GET /api/organization/[organizationId]/pending-requests
 * Get pending authorization requests for a specific organization
 */
async function getPendingRequestsHandler(
  request: NextRequest,
  authContext: any,
  { params }: { params: { organizationId: string } }
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = params;

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

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
      .sort({ auditCreatedDateTime: -1 })
      .limit(limit)
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
      ipAddress: grant.requestMetadata?.ipAddress,
      userAgent: grant.requestMetadata?.userAgent,
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

// Create a wrapper to handle the route parameters correctly
async function wrappedHandler(request: NextRequest, context: { params: { organizationId: string } }, authContext: any) {
  return getPendingRequestsHandler(request, authContext, context);
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(async (request: NextRequest, authContext: any) => {
  // Extract organizationId from URL
  const url = new URL(request.url);
  const pathSegments = url.pathname.split("/");
  const organizationIdIndex = pathSegments.indexOf("organization") + 1;
  const organizationId = pathSegments[organizationIdIndex];

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  return getPendingRequestsHandler(request, authContext, { params: { organizationId } });
});
