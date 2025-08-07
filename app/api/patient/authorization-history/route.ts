import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withAnyAuth } from "@/lib/middleware/auth";
import { getAuthorizationGrantsForPatient } from "@/lib/services/authorization-service";
// Import models to ensure they're registered for populate operations
import "@/lib/models/Organization";
import "@/lib/models/Practitioner";
import "@/lib/models/User";

/**
 * GET /api/patient/authorization-history
 * Get authorization grant history for the authenticated patient
 * Query params: status (optional), limit (optional, default 20), page (optional, default 1), includeExpired (optional, default true)
 */
async function getAuthorizationHistoryHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const includeExpired = searchParams.get("includeExpired") !== "false";

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Limit must be between 1 and 100" }, { status: 400 });
    }

    if (page < 1) {
      return NextResponse.json({ error: "Page must be greater than 0" }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Extract patient identifier logic into a single variable
    const patientIdentifier = authContext.digitalIdentifier || authContext.userId;

    // Get the patient's authorization grant history with pagination
    const result = await getAuthorizationGrantsForPatient(patientIdentifier, {
      status: status || undefined,
      limit,
      offset,
      includeExpired,
    });

    return NextResponse.json({
      success: true,
      data: {
        grants: result.grants,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
        patientId: patientIdentifier,
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
