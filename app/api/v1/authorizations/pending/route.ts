import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";

/**
 * GET /api/v1/authorizations/pending
 * Get pending authorization requests for the authenticated patient
 *
 * This endpoint allows patients to see authorization requests that need approval
 */
async function pendingHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get pending requests for this user
    const pendingRequests = await AuthorizationGrant.findPendingRequests(authContext.userId);

    // Transform for patient UI
    const formattedRequests = await Promise.all(
      pendingRequests.map(async (grant) => {
        const organization = grant.organizationId as any;
        const practitioner = grant.requestingPractitionerId as any;

        return {
          grantId: grant._id.toString(),
          organization: {
            id: organization._id.toString(),
            name: organization.organizationInfo.name,
            type: organization.organizationInfo.type,
            address: organization.getFullAddress(),
          },
          practitioner: practitioner
            ? {
                id: practitioner._id.toString(),
                firstName: practitioner.personalInfo.firstName,
                lastName: practitioner.personalInfo.lastName,
                role: practitioner.professionalInfo.role,
                specialty: practitioner.professionalInfo.specialty,
              }
            : null,
          requestedScope: grant.accessScope,
          timeWindowHours: grant.grantDetails.timeWindowHours,
          status: grant.grantDetails.status,
          createdAt: grant.auditCreatedDateTime,
          expiresAt: grant.grantDetails.expiresAt,
          requestMetadata: {
            ipAddress: grant.requestMetadata.ipAddress,
            location: grant.requestMetadata.location,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        pendingRequests: formattedRequests,
        count: formattedRequests.length,
      },
    });
  } catch (error) {
    console.error("Error fetching pending authorization requests:", error);
    return NextResponse.json({ error: "Failed to fetch pending requests" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withAuth(pendingHandler, {
  allowedRoles: [UserRole.PATIENT, UserRole.ADMIN],
  requireAuth: true,
});
