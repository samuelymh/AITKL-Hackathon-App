import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";

/**
 * Transform a single pending grant with error handling
 */
async function transformPendingGrant(grant: any) {
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
              practitioner.userId?.personalInfo?.firstName ||
              practitioner.personalInfo?.firstName ||
              "Unknown",
            lastName:
              practitioner.userId?.personalInfo?.lastName ||
              practitioner.personalInfo?.lastName ||
              "User",
            role:
              practitioner.professionalInfo?.practitionerType ||
              practitioner.professionalInfo?.role ||
              "practitioner",
            specialty: practitioner.professionalInfo?.specialty || "General",
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
  } catch (error) {
    console.error(`Error transforming pending grant ${grant._id}:`, error);
    return null; // Skip this grant if transformation fails
  }
}

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
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get pending requests for this user using optimized static method
    const pendingRequests = await AuthorizationGrant.findPendingRequests(
      authContext.userId,
    );

    // Transform requests with resilient error handling
    const settledResults = await Promise.allSettled(
      pendingRequests.map(transformPendingGrant),
    );

    const formattedRequests = settledResults
      .filter(
        (result) => result.status === "fulfilled" && result.value !== null,
      )
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    // Log any failed transformations
    const failedCount = settledResults.length - formattedRequests.length;
    if (failedCount > 0) {
      console.warn(
        `Failed to transform ${failedCount} pending grants for user ${authContext.userId}`,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pendingRequests: formattedRequests,
        count: formattedRequests.length,
      },
    });
  } catch (error) {
    console.error("Error fetching pending authorization requests:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch pending requests: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const GET = withAuth(pendingHandler, {
  allowedRoles: [UserRole.PATIENT, UserRole.ADMIN],
  requireAuth: true,
});
