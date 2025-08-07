import { NextRequest, NextResponse } from "next/server";
import { OrganizationService } from "@/lib/services/organizationService";
import { logger } from "@/lib/logger";
import { InputSanitizer } from "@/lib/utils/input-sanitizer";

/**
 * GET endpoint to retrieve list of organizations for dropdown selection
 * This endpoint returns a simplified list suitable for UI components
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verified = InputSanitizer.sanitizeText(
      searchParams.get("verified") || "true",
    ); // Default to verified organizations only
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "50")),
      100,
    ); // Max 100 results

    // Search organizations with basic filters
    const organizations = await OrganizationService.searchOrganizations(
      undefined, // no query filter
      undefined, // no type filter
      undefined, // no location filter
      {
        page: 1,
        limit: limit,
        onlyVerified: verified === "true",
      },
    );

    // Return simplified organization data for dropdown
    const organizationList = organizations.map((org: any) => ({
      id: org._id.toString(),
      name: org.organizationInfo.name,
      type: org.organizationInfo.type,
      city: org.address.city,
      state: org.address.state,
      verified: org.verification.isVerified,
      registrationNumber: org.organizationInfo.registrationNumber,
    }));

    return NextResponse.json({
      success: true,
      data: {
        organizations: organizationList,
        count: organizationList.length,
      },
    });
  } catch (error) {
    logger.error("Organization list retrieval error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve organizations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
