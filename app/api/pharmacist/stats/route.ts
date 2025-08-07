import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import Practitioner from "@/lib/models/Practitioner";
import { getPharmacyStatistics } from "@/lib/services/pharmacy-service";

/**
 * GET /api/pharmacist/stats
 * Get statistics for a pharmacist including prescriptions processed, pending verifications, etc.
 */
async function getPharmacistStatsHandler(
  request: NextRequest,
  authContext: any,
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the practitioner record for the authenticated user
    const practitioner = await Practitioner.findOne({
      userId: authContext.userId,
    });
    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 },
      );
    }

    // Get pharmacy statistics
    const stats = await getPharmacyStatistics(practitioner._id.toString());

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching pharmacist stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacist stats" },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPharmacistStatsHandler);
