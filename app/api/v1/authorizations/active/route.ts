import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";

/**
 * Transform a single grant with error handling
 */
async function transformGrant(grant: any) {
  try {
    const organization = grant.organizationId;
    const practitioner = grant.requestingPractitionerId;

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
            firstName:
              practitioner.userId?.personalInfo?.firstName || practitioner.personalInfo?.firstName || "Unknown",
            lastName: practitioner.userId?.personalInfo?.lastName || practitioner.personalInfo?.lastName || "User",
            role:
              practitioner.professionalInfo?.practitionerType || practitioner.professionalInfo?.role || "practitioner",
            specialty: practitioner.professionalInfo?.specialty || "General",
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
  } catch (error) {
    console.error(`Error transforming grant ${grant._id}:`, error);
    return null; // Skip this grant if transformation fails
  }
}

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

    // Transform grants with resilient error handling
    const settledResults = await Promise.allSettled(activeGrants.map(transformGrant));

    const formattedGrants = settledResults
      .filter((result) => result.status === "fulfilled" && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    // Log any failed transformations
    const failedCount = settledResults.length - formattedGrants.length;
    if (failedCount > 0) {
      console.warn(`Failed to transform ${failedCount} grants for user ${authContext.userId}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        activeGrants: formattedGrants,
        count: formattedGrants.length,
      },
    });
  } catch (error) {
    console.error("Error fetching active authorization grants:", error);
    return NextResponse.json(
      { error: `Failed to fetch active grants: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const GET = withAuth(activeHandler, {
  allowedRoles: [UserRole.PATIENT, UserRole.ADMIN],
  requireAuth: true,
});
