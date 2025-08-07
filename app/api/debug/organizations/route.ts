import { NextRequest, NextResponse } from "next/server";
import { withDevOnly } from "@/lib/middleware/dev-only";
import { logger } from "@/lib/logger";
import connectToDatabase from "@/lib/db.connection";
import Organization from "@/lib/models/Organization";

/**
 * Debug endpoint to check organization data
 */
async function handler(request: NextRequest) {
  try {
    await connectToDatabase();

    const totalCount = await Organization.countDocuments();
    const verifiedCount = await Organization.countDocuments({
      "verification.isVerified": true,
    });
    const activeCount = await Organization.countDocuments({
      "metadata.isActive": true,
    });

    const sampleOrgs = await Organization.find()
      .limit(5)
      .select(
        "organizationInfo.name organizationInfo.type verification.isVerified address.city address.state",
      );

    return NextResponse.json({
      success: true,
      debug: {
        totalCount,
        verifiedCount,
        activeCount,
        sampleOrganizations: sampleOrgs.map((org) => ({
          id: org._id,
          name: org.organizationInfo?.name || "No name",
          type: org.organizationInfo?.type || "No type",
          verified: org.verification?.isVerified || false,
          city: org.address?.city || "No city",
          state: org.address?.state || "No state",
        })),
      },
    });
  } catch (error) {
    logger.error("Debug API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Debug failed",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export const GET = withDevOnly(handler);
