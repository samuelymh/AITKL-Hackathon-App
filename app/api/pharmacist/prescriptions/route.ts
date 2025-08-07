import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import {
  getRecentPrescriptions,
  getPendingPrescriptionVerifications,
} from "@/lib/services/pharmacy-service";

/**
 * GET /api/pharmacist/prescriptions
 * Get recent prescriptions for a pharmacist
 * Query params: status (optional), limit (optional, default 20)
 */
async function getPharmacistPrescriptionsHandler(
  request: NextRequest,
  authContext: any,
) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 },
      );
    }

    // Find the practitioner record for the authenticated user using service
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json(
        { error: "Practitioner not found" },
        { status: 404 },
      );
    }

    let prescriptions;

    if (status === "pending") {
      prescriptions = await getPendingPrescriptionVerifications(
        practitioner._id.toString(),
      );
    } else {
      prescriptions = await getRecentPrescriptions(
        practitioner._id.toString(),
        limit,
      );
    }

    return NextResponse.json({
      success: true,
      data: prescriptions,
      total: prescriptions.length,
    });
  } catch (error) {
    console.error("Error fetching pharmacist prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacist prescriptions" },
      { status: 500 },
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPharmacistPrescriptionsHandler);
