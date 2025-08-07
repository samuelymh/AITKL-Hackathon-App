import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";
import { logger } from "@/lib/logger";

/**
 * Input sanitization helper
 */
function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove potential regex special characters and NoSQL injection attempts
  return input
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
    .replace(/[${}]/g, "") // Remove potential NoSQL injection chars
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * GET /api/organizations/public
 * Get list of verified organizations for public use (registration, etc.)
 * No authentication required
 */
export async function GET(request: NextRequest) {
  try {
    logger.info("Public organizations list requested");

    await connectToDatabase();

    // Get query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100,
    ); // Cap at 100
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query filter - only show verified organizations for public API
    const filter: any = {
      "verification.isVerified": true, // Only verified organizations for public use
    };

    // Filter by organization type
    if (type) {
      // Support comma-separated types (e.g., "hospital,clinic")
      const types = type.split(",").map((t) => t.trim());
      filter["organizationInfo.type"] = {
        $in: types.map((t) => new RegExp(`^${t}$`, "i")), // Case-insensitive exact match for each type
      };
    }
    // Remove the default type filter - return all organization types

    // Search by organization name with sanitization
    if (search) {
      const sanitizedSearch = sanitizeSearchInput(search);
      if (sanitizedSearch) {
        filter["organizationInfo.name"] = {
          $regex: sanitizedSearch,
          $options: "i", // case-insensitive
        };
      }
    }

    // Get organizations with pagination
    const organizations = await Organization.find(filter)
      .select(
        "organizationInfo.name organizationInfo.type organizationInfo.description address verification.isVerified _id",
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
            city: org.address.city,
            state: org.address.state,
            country: org.address.country,
          }
        : null,
      isVerified: true, // Only verified organizations are returned
    }));

    logger.info(`Retrieved ${organizations.length} public organizations`);

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
    logger.error("Error retrieving public organizations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve organizations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
