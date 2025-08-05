import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";

/**
 * GET /api/v1/authorizations/active
 * Get active authorization grants for the authenticated patient
 *
 * This endpoint allows patients to see which healthcare providers currently have access
 */
async function activeHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get active grants for this user
    const activeGrants = await AuthorizationGrant.findActiveGrants(authContext.userId);

    // Transform for patient UI
    const formattedGrants = await Promise.all(
      activeGrants.map(async (grant) => {
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
          accessScope: grant.accessScope,
          timeWindowHours: grant.grantDetails.timeWindowHours,
          status: grant.grantDetails.status,
          grantedAt: grant.grantDetails.grantedAt,
          expiresAt: grant.grantDetails.expiresAt,
          isExpired: grant.isExpired(),
          remainingTimeMinutes: Math.max(
            0,
            Math.floor((grant.grantDetails.expiresAt.getTime() - Date.now()) / (1000 * 60))
          ),
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
        activeGrants: formattedGrants,
        count: formattedGrants.length,
      },
    });
  } catch (error) {
    console.error("Error fetching active authorization grants:", error);
    return NextResponse.json({ error: "Failed to fetch active grants" }, { status: 500 });
  }
}

// Export with authentication middleware
export const GET = withAuth(activeHandler, {
  allowedRoles: [UserRole.PATIENT, UserRole.ADMIN],
  requireAuth: true,
});
