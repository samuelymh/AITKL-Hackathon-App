import dbConnect from "@/lib/db.connection";
import {
  withEncounterAuth,
  withEncounterAuthAndBody,
} from "@/lib/middleware/api-wrapper";
import { EncounterService } from "@/lib/services/encounter-service";
import { createSuccessResponse } from "@/lib/api-helpers";
import { auditLogger } from "@/lib/services/audit-logger";
import {
  encounterQuerySchema,
  type EncounterQueryParams,
} from "@/lib/validation/encounter-schemas";

/**
 * GET /api/v1/encounters
 * List encounters with filtering and pagination
 */
export const GET = withEncounterAuth(
  async (request, context, authorizedContext) => {
    await dbConnect();

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const query = encounterQuerySchema.parse(queryParams);

    const userId = authorizedContext.authGrant.userId._id.toString();
    const organizationId =
      authorizedContext.authGrant.organizationId._id.toString();
    const practitionerId = authorizedContext.practitioner._id.toString();

    // Get encounters using service
    const result = await EncounterService.listEncounters(
      userId,
      organizationId,
      {
        status: query.status,
        type: query.type,
        startDate: query.startDate,
        endDate: query.endDate,
      },
      {
        page: query.page || 1,
        limit: query.limit || 10,
      },
    );

    // Log the access for audit
    auditLogger.log({
      userId,
      action: "LIST_ENCOUNTERS",
      resource: "encounters",
      method: "GET",
      endpoint: "/api/v1/encounters",
      ip: "internal",
      userAgent: "system",
      statusCode: 200,
      details: {
        practitionerId,
        organizationId,
        page: query.page || 1,
        limit: query.limit || 10,
        total: result.totalCount,
        filters: query,
      },
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(result.totalCount / limit);

    return createSuccessResponse({
      encounters: result.encounters,
      pagination: {
        page,
        limit,
        total: result.totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  },
  "canViewMedicalHistory",
);

/**
 * POST /api/v1/encounters
 * Create a new encounter
 */
export const POST = withEncounterAuthAndBody(
  async (request, context, authorizedContext, body) => {
    await dbConnect();

    const practitionerId = authorizedContext.practitioner._id.toString();
    const userId = authorizedContext.authGrant.userId._id.toString();
    const authorizationGrantId = authorizedContext.authGrant._id.toString();

    // Create encounter using service
    const encounter = await EncounterService.createEncounter(
      body,
      practitionerId,
      authorizationGrantId,
    );

    // Log the creation for audit
    auditLogger.log({
      userId,
      action: "CREATE_ENCOUNTER",
      resource: "encounters",
      method: "POST",
      endpoint: "/api/v1/encounters",
      ip: "internal",
      userAgent: "system",
      statusCode: 201,
      details: {
        encounterId: encounter._id.toString(),
        practitionerId,
        organizationId:
          authorizedContext.authGrant.organizationId._id.toString(),
        encounterNumber: encounter.encounter.encounterNumber,
        encounterType: encounter.encounter.encounterType,
        chiefComplaint: encounter.encounter.chiefComplaint,
      },
    });

    return createSuccessResponse(
      {
        encounter,
        message: "Encounter created successfully",
      },
      201,
    );
  },
  "canCreateEncounters",
);
