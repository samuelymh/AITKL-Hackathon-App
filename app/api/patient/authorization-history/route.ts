import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withAnyAuth } from "@/lib/middleware/auth";
import { getAuthorizationGrantsForPatient } from "@/lib/services/authorization-service";

/**
 * GET /api/patient/authorization-history
 * Get authorization grant history for the authenticated patient
 * Query params: status (optional), limit (optional, default 50), includeExpired (optional, default true)
 */
async function getAuthorizationHistoryHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const includeExpired = searchParams.get("includeExpired") !== "false";

    // Validate limit parameter
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    // Get the patient's authorization grant history
    const grants = await getAuthorizationGrantsForPatient(authContext.digitalIdentifier || authContext.userId, {
      status: status || undefined,
      limit,
      includeExpired,
    });

    return NextResponse.json({
      success: true,
      data: {
        grants,
        total: grants.length,
        patientId: authContext.digitalIdentifier || authContext.userId,
      },
    });
  } catch (error) {
    console.error("Error fetching authorization history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch authorization history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = withAnyAuth(getAuthorizationHistoryHandler);
