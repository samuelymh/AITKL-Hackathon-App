import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrganizationService } from "@/lib/services/organizationService";

// Validation schema for search parameters
const searchSchema = z.object({
  query: z.string().min(1).max(100),
  type: z.enum(["HOSPITAL", "CLINIC", "PHARMACY", "LABORATORY"]).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  verified: z.enum(["true", "false"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate parameters
    const validation = searchSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { query, type, city, state, verified, limit = "20", page = "1" } = validation.data;

    // Calculate pagination
    const limitNum = Math.min(parseInt(limit), 50); // Max 50 results
    const pageNum = Math.max(parseInt(page), 1);

    // Build location filter using object destructuring with conditional assignment
    const location = {
      ...(city && { city }),
      ...(state && { state }),
    };

    // Build options
    const options = {
      page: pageNum,
      limit: limitNum,
      onlyVerified: verified === "true",
    };

    // Search organizations using service
    const organizations = await OrganizationService.searchOrganizations(
      query,
      type,
      Object.keys(location).length > 0 ? location : undefined,
      options
    );

    // Get total count using service (eliminates code duplication)
    const totalCount = await OrganizationService.getSearchCount(
      query,
      type,
      Object.keys(location).length > 0 ? location : undefined,
      verified === "true"
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json({
      success: true,
      data: {
        organizations: organizations.map((org: any) => org.toPublicJSON()),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Organization search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search organizations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
