import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPendingAuthorizationGrants } from "@/lib/services/authorization-service";

/**
 * GET /api/organization/[organizationId]/pending-requests
 * Get pending authorization requests for a specific organization
 */
async function getPendingRequestsHandler(
  request: NextRequest,
  authContext: any,
  { params }: { params: { organizationId: string } },
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Validate organizationId format (basic MongoDB ObjectId check)
    if (!/^[0-9a-fA-F]{24}$/.test(organizationId)) {
      return NextResponse.json(
        { error: "Invalid organization ID format" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    // Use the optimized service function
    const pendingGrants = await getPendingAuthorizationGrants(organizationId);

    // Apply limit
    const limitedGrants = pendingGrants.slice(0, limit);

    // Add additional metadata for this endpoint
    const enhancedGrants = limitedGrants.map((grant) => ({
      ...grant,
      // Additional fields could be added here if needed from the original implementation
    }));

    return NextResponse.json({
      success: true,
      data: enhancedGrants,
      total: enhancedGrants.length,
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending requests" },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(
  async (request: NextRequest, authContext: any) => {
    // Extract organizationId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const organizationIdIndex = pathSegments.indexOf("organization") + 1;
    const organizationId = pathSegments[organizationIdIndex];

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    return getPendingRequestsHandler(request, authContext, {
      params: { organizationId },
    });
  },
);
