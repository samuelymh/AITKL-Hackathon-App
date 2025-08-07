import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import Organization from "@/lib/models/Organization";

/**
 * GET /api/pharmacist/authorizations
 * Get authorization grants for a pharmacist's organization
 * Query params: status (optional), limit (optional, default 20)
 */
async function getPharmacistAuthorizationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    // Ensure models are registered
    User;
    Practitioner;
    Organization;

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE"; // Default to ACTIVE grants
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    // Find the practitioner record for the authenticated user
    const practitioner = await getPractitionerByUserId(authContext.userId);
    console.log("🔍 Debug - Auth Context:", { userId: authContext.userId, role: authContext.role });
    console.log("🔍 Debug - Practitioner found:", practitioner ? `ID: ${practitioner._id}` : "null");

    if (!practitioner) {
      return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
    }

    // Find the organization member record to get organizationId
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;

    // Try both schema structures for compatibility
    let organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: "active", // New schema
    });

    // If not found with new schema, try old schema
    if (!organizationMember) {
      organizationMember = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
        "membership.isActive": true, // Old schema
      });
    }

    console.log("🔍 Debug - Organization member query:", {
      practitionerId: practitioner._id,
      "tried new schema (status: active)": !!organizationMember,
    });
    console.log("🔍 Debug - Organization member found:", organizationMember ? `ID: ${organizationMember._id}` : "null");

    if (!organizationMember) {
      // Let's also try a broader search for debugging
      const allMembersForPractitioner = await OrganizationMember.find({
        practitionerId: practitioner._id,
      });
      console.log("🔍 Debug - All members for practitioner:", allMembersForPractitioner.length);
      allMembersForPractitioner.forEach((member, i) => {
        console.log(
          `   ${i + 1}. Status: ${member.status}, Active: ${member.membership?.isActive}, Org: ${member.organizationId}`
        );
      });

      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    // Build query based on status
    let query: any = {
      organizationId: organizationMember.organizationId,
    };

    if (status === "ACTIVE") {
      query["grantDetails.status"] = "ACTIVE";
      query["grantDetails.expiresAt"] = { $gt: new Date() }; // Not expired
    } else if (status === "PENDING") {
      query["grantDetails.status"] = "PENDING";
    } else if (status) {
      query["grantDetails.status"] = status;
    }

    // Fetch authorization grants with populated data
    const grants = await AuthorizationGrant.find(query).sort({ createdAt: -1 }).limit(limit); // Transform data for the frontend
    const transformedGrants = grants.map((grant) => {
      const user = grant.userId as any;
      const organization = grant.organizationId as any;
      const requester = grant.requestingPractitionerId as any;

      return {
        id: grant._id.toString(),
        patient: {
          name:
            user?.personalInfo?.firstName && user?.personalInfo?.lastName
              ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}`
              : "Unknown Patient",
          digitalIdentifier: user?.digitalIdentifier || "N/A",
        },
        status: grant.grantDetails?.status || "UNKNOWN",
        grantedAt: grant.grantDetails?.grantedAt,
        expiresAt: grant.grantDetails?.expiresAt,
        timeWindowHours: grant.grantDetails?.timeWindowHours || 24,
        accessScope: Object.entries(grant.accessScope || {})
          .filter(([key, value]) => value === true)
          .map(([key]) => key),
        organization: organization
          ? {
              name: organization.organizationInfo?.name || "Unknown Organization",
              type: organization.organizationInfo?.type || "UNKNOWN",
            }
          : null,
        requester: requester?.userId
          ? {
              name: `${requester.userId.personalInfo?.firstName || "Unknown"} ${requester.userId.personalInfo?.lastName || "User"}`,
              type: requester.professionalInfo?.practitionerType || "practitioner",
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedGrants,
      total: transformedGrants.length,
      status: status,
    });
  } catch (error) {
    console.error("Error fetching pharmacist authorizations:", error);
    return NextResponse.json({ error: "Failed to fetch authorization grants" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPharmacistAuthorizationsHandler);
