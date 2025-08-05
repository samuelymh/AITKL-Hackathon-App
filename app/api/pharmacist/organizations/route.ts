import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";
import { withAuth } from "@/lib/middleware/auth";
import { logger } from "@/lib/logger";
import { UserRole } from "@/lib/types/enums";

/**
 * GET /api/pharmacist/organizations
 * Get list of verified organizations for pharmacist profile setup
 */
async function getOrganizations(request: NextRequest, authContext: any) {
  try {
    logger.info(`User ${authContext.userId} requesting organizations list`);

    await connectToDatabase();

    // Get query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const verified = url.searchParams.get("verified");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query filter
    const filter: any = {};

    // Filter by organization type (pharmacy, hospital, clinic, etc.)
    if (type) {
      filter["organizationInfo.type"] = type;
    } else {
      // Default to pharmacy-related organizations
      filter["organizationInfo.type"] = {
        $in: ["pharmacy", "hospital", "clinic", "healthcare_network", "pharmaceutical_company"],
      };
    }

    // Filter by verification status
    if (verified === "true") {
      filter["verification.isVerified"] = true;
    }

    // Search by organization name
    if (search) {
      filter["organizationInfo.name"] = {
        $regex: search,
        $options: "i", // case-insensitive
      };
    }

    // Get organizations with pagination
    const organizations = await Organization.find(filter)
      .select(
        "organizationInfo.name organizationInfo.type organizationInfo.description address verification.isVerified _id"
      )
      .sort({ "organizationInfo.name": 1 })
      .skip(offset)
      .limit(limit);

    // Get total count for pagination
    const total = await Organization.countDocuments(filter);

    const formattedOrganizations = organizations.map((org) => ({
      id: org._id,
      name: org.organizationInfo?.name,
      type: org.organizationInfo?.type,
      description: org.organizationInfo?.description,
      address: org.address
        ? {
            street: org.address.street,
            city: org.address.city,
            state: org.address.state,
            country: org.address.country,
          }
        : null,
      verificationStatus: org.verification?.isVerified ? "verified" : "pending",
      isVerified: org.verification?.isVerified || false,
    }));

    logger.info(`Retrieved ${organizations.length} organizations for user ${authContext.userId}`);

    return NextResponse.json({
      success: true,
      data: {
        organizations: formattedOrganizations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.error("Error retrieving organizations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve organizations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
const authenticatedHandler = withAuth(getOrganizations, {
  allowedRoles: [UserRole.PHARMACIST, UserRole.ADMIN, UserRole.DOCTOR],
});

export { authenticatedHandler as GET };
