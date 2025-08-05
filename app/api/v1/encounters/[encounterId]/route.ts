import dbConnect from "@/lib/db.connection";
import { withEncounterAuth, withEncounterAuthAndBody } from "@/lib/middleware/api-wrapper";
import { EncounterAuthMiddleware } from "@/lib/middleware/encounter-auth";
import { EncounterService } from "@/lib/services/encounter-service";
import { createSuccessResponse } from "@/lib/api-helpers";
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
export const GET = withEncounterAuth(async (request, { params }, authorizedContext) => {
  await dbConnect();

  const { encounterId } = params;

  if (!encounterId) {
    throw new Error("Encounter ID is required");
  }

  const userId = authorizedContext.authGrant.userId._id.toString();

  // Get encounter using service
  const encounter = await EncounterService.getEncounterById(encounterId);

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
      practitionerId: authorizedContext.practitioner._id.toString(),
      organizationId: authorizedContext.authGrant.organizationId._id.toString(),
      encounterType: encounter.encounter.encounterType,
      encounterDate: encounter.encounter.encounterDate,
    },
  });

  return createSuccessResponse({
    encounter,
  });
}, "canViewMedicalHistory");

/**
 * PUT /api/v1/encounters/[encounterId]
 * Update an encounter
 */
export const PUT = withEncounterAuthAndBody(async (request, { params }, authorizedContext, body) => {
  await dbConnect();

  const { encounterId } = params;

  if (!encounterId) {
    throw new Error("Encounter ID is required");
  }

  const practitionerId = authorizedContext.practitioner._id.toString();
  const userId = authorizedContext.authGrant.userId._id.toString();

  // Validate encounter access first
  await EncounterAuthMiddleware.validateEncounterAccess(encounterId, authorizedContext);

  // Update the encounter using service
  const updatedEncounter = await EncounterService.updateEncounter(encounterId, body, practitionerId);

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
      organizationId: authorizedContext.authGrant.organizationId._id.toString(),
      updatedFields: Object.keys(body),
    },
  });

  return createSuccessResponse({
    encounter: updatedEncounter,
    message: "Encounter updated successfully",
  });
}, "canCreateEncounters");
