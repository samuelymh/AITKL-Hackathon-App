import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db.connection";
import Encounter from "@/lib/models/Encounter";
import { EncounterAuthMiddleware } from "@/lib/middleware/encounter-auth";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helpers";
import { AuthorizationError, NotFoundError } from "@/lib/errors/custom-errors";
import { auditLogger } from "@/lib/services/audit-logger";

interface RouteParams {
  params: {
    encounterId: string;
  };
}

/**
 * GET /api/v1/encounters/[encounterId]
 * Get a specific encounter by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { encounterId } = params;
    const { searchParams } = new URL(request.url);

    // Extract required parameters for authorization
    const practitionerId = searchParams.get("practitionerId");
    const userId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");

    if (!practitionerId || !userId || !organizationId) {
      return createErrorResponse("practitionerId, userId, and organizationId are required query parameters", 400);
    }

    // Validate authorization
    const authorizedContext = await EncounterAuthMiddleware.validateEncounterAuthorization(
      request,
      practitionerId,
      userId,
      organizationId,
      "canViewMedicalHistory"
    );

    // Find the encounter
    const encounter = await Encounter.findById(encounterId).populate([
      "userId",
      "organizationId",
      "attendingPractitionerId",
    ]);

    if (!encounter) {
      return createErrorResponse("Encounter not found", 404);
    }

    // Validate encounter access
    await EncounterAuthMiddleware.validateEncounterAccess(encounterId, authorizedContext);

    // Log the access for audit
    auditLogger.log({
      userId,
      action: "VIEW_ENCOUNTER",
      resource: "encounters",
      method: "GET",
      endpoint: `/api/v1/encounters/${encounterId}`,
      ip: "internal",
      userAgent: "system",
      statusCode: 200,
      details: {
        encounterId,
        practitionerId,
        organizationId,
        encounterType: encounter.encounter.encounterType,
        encounterDate: encounter.encounter.encounterDate,
      },
    });

    return createSuccessResponse({
      encounter,
    });
  } catch (error) {
    console.error("Error getting encounter:", error);

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, 403);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message, 404);
    }

    return createErrorResponse("Failed to get encounter", 500);
  }
}

/**
 * PUT /api/v1/encounters/[encounterId]
 * Update an encounter
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();

    const { encounterId } = params;
    const body = await request.json();

    // Extract required parameters for authorization
    const practitionerId = body.practitionerId;
    const userId = body.userId;
    const organizationId = body.organizationId;

    if (!practitionerId || !userId || !organizationId) {
      return createErrorResponse("practitionerId, userId, and organizationId are required", 400);
    }

    // Validate authorization
    const authorizedContext = await EncounterAuthMiddleware.validateEncounterAuthorization(
      request,
      practitionerId,
      userId,
      organizationId,
      "canCreateEncounters" // Need create permission to update
    );

    // Validate encounter access
    const encounter = await EncounterAuthMiddleware.validateEncounterAccess(encounterId, authorizedContext);

    // Update allowed fields
    const updateData: any = {};

    if (body.notes) {
      updateData["encounter.notes"] = {
        __enc_notes: true,
        value: body.notes,
      };
    }

    if (body.vitals) {
      updateData["encounter.vitals"] = body.vitals;
    }

    // Add audit fields
    updateData.auditUpdatedBy = practitionerId;
    updateData.auditUpdatedDateTime = new Date();
    updateData.$inc = { auditVersion: 1 };

    // Update the encounter
    const updatedEncounter = await Encounter.findByIdAndUpdate(encounterId, updateData, {
      new: true,
      runValidators: true,
    }).populate(["userId", "organizationId", "attendingPractitionerId"]);

    // Log the update for audit
    auditLogger.log({
      userId,
      action: "UPDATE_ENCOUNTER",
      resource: "encounters",
      method: "PUT",
      endpoint: `/api/v1/encounters/${encounterId}`,
      ip: "internal",
      userAgent: "system",
      statusCode: 200,
      details: {
        encounterId,
        practitionerId,
        organizationId,
        updatedFields: Object.keys(body),
      },
    });

    return createSuccessResponse({
      encounter: updatedEncounter,
      message: "Encounter updated successfully",
    });
  } catch (error) {
    console.error("Error updating encounter:", error);

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, 403);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message, 404);
    }

    return createErrorResponse("Failed to update encounter", 500);
  }
}
