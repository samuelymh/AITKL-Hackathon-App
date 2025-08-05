import { NextRequest } from "next/server";
import dbConnect from "@/lib/db.connection";
import Encounter from "@/lib/models/Encounter";
import { EncounterAuthMiddleware } from "@/lib/middleware/encounter-auth";
import { createEncounterSchema, encounterQuerySchema } from "@/lib/validation/temp-encounter-schemas";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-helpers";
import { ValidationError, AuthorizationError, NotFoundError } from "@/lib/errors/custom-errors";
import { auditLogger } from "@/lib/services/audit-logger";
import mongoose from "mongoose";

/**
 * GET /api/v1/encounters
 * List encounters with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validationResult = encounterQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return createErrorResponse("Invalid query parameters", 400);
    }

    const query = validationResult.data;

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

    // Build MongoDB filter
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      auditDeletedDateTime: { $exists: false },
    };

    // Add optional filters based on actual model structure
    if (query.status) {
      filter["encounter.encounterType"] = query.status; // Map to encounterType
    }
    if (query.type) {
      filter["encounter.encounterType"] = query.type;
    }
    if (query.startDate || query.endDate) {
      filter["encounter.encounterDate"] = {};
      if (query.startDate) {
        filter["encounter.encounterDate"].$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter["encounter.encounterDate"].$lte = new Date(query.endDate);
      }
    }

    // Calculate pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [encounters, totalCount] = await Promise.all([
      Encounter.find(filter)
        .populate(["userId", "organizationId", "attendingPractitionerId"])
        .sort({ "encounter.encounterDate": -1 })
        .skip(skip)
        .limit(limit),
      Encounter.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Log the query for audit
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
        filters: query,
        resultCount: encounters.length,
        totalCount,
        page,
        limit,
      },
    });

    return createSuccessResponse({
      encounters,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      },
      filters: query,
    });
  } catch (error) {
    console.error("Error listing encounters:", error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400);
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, 403);
    }

    return createErrorResponse("Failed to list encounters", 500);
  }
}

/**
 * POST /api/v1/encounters
 * Create a new encounter
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = createEncounterSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse("Invalid encounter data", 400);
    }

    const encounterData = validationResult.data;

    // Extract required IDs for authorization
    const { practitionerId, userId, organizationId } = encounterData;

    // Validate authorization
    const authorizedContext = await EncounterAuthMiddleware.validateEncounterAuthorization(
      request,
      practitionerId,
      userId,
      organizationId,
      "canCreateEncounters"
    );

    // Validate that all referenced entities exist
    await validateReferencedEntities(encounterData);

    // Create the encounter using the actual model structure
    const encounter = new Encounter({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      attendingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
      authorizationGrantId: authorizedContext.authGrant._id, // From authorization

      encounter: {
        chiefComplaint: encounterData.chiefComplaint,
        notes: {
          __enc_notes: true, // Encrypted field marker
          value: encounterData.notes || "",
        },
        encounterDate: encounterData.startDateTime ? new Date(encounterData.startDateTime) : new Date(),
        encounterType: encounterData.type || "ROUTINE",
        vitals: encounterData.vitals,
      },

      diagnoses:
        encounterData.diagnoses?.map((diagnosis: any) => ({
          code: diagnosis.code,
          description: diagnosis.display,
          notes: diagnosis.notes,
          isChronic: diagnosis.use === "chronic" || false,
          diagnosedAt: new Date(),
        })) || [],

      prescriptions:
        encounterData.prescriptions?.map((prescription: any) => ({
          medicationName: prescription.medicationDisplay,
          dosage: prescription.dosageText,
          frequency: prescription.frequency || "",
          notes: prescription.instructions,
          status: "ISSUED" as any, // Default status
          prescribingPractitionerId: new mongoose.Types.ObjectId(practitionerId),
          issuedAt: new Date(),
        })) || [],

      // Audit fields
      auditCreatedBy: new mongoose.Types.ObjectId(practitionerId),
      auditCreatedDateTime: new Date(),
      auditVersion: 1,
    });

    // Save the encounter
    const savedEncounter = await encounter.save();

    // Populate for response
    const populatedEncounter = await Encounter.findById(savedEncounter._id).populate([
      "userId",
      "organizationId",
      "attendingPractitionerId",
    ]);

    // Log the encounter creation for audit
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
        encounterId: savedEncounter._id.toString(),
        practitionerId,
        organizationId,
        encounterType: encounterData.type,
        encounterClass: encounterData.class,
        diagnosesCount: encounter.diagnoses.length,
        prescriptionsCount: encounter.prescriptions.length,
      },
    });

    return createSuccessResponse(
      {
        encounter: populatedEncounter,
        message: "Encounter created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating encounter:", error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400);
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, 403);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(error.message, 404);
    }

    return createErrorResponse("Failed to create encounter", 500);
  }
}

/**
 * Validate that all referenced entities exist
 */
async function validateReferencedEntities(encounterData: any) {
  const User = (await import("@/lib/models/User")).default;
  const { default: Organization } = await import("@/lib/models/Organization");
  const { default: Practitioner } = await import("@/lib/models/Practitioner");

  // Validate user exists
  const user = await User.findById(encounterData.userId);
  if (!user) {
    throw new NotFoundError("Patient not found");
  }

  // Validate organization exists
  const organization = await Organization.findById(encounterData.organizationId);
  if (!organization) {
    throw new NotFoundError("Organization not found");
  }

  // Validate practitioner exists
  const practitioner = await Practitioner.findById(encounterData.practitionerId);
  if (!practitioner) {
    throw new NotFoundError("Practitioner not found");
  }

  // Validate practitioner belongs to organization
  if (practitioner.organizationId.toString() !== encounterData.organizationId) {
    throw new ValidationError("Practitioner does not belong to the specified organization");
  }
}

/**
 * Generate a unique encounter number for the organization
 */
async function generateEncounterNumber(organizationId: string): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  // Format: ENC-YYYYMMDD-NNNN
  const prefix = `ENC-${year}${month}${day}`;

  // Find the highest encounter number for today
  const latestEncounter = await Encounter.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ auditCreatedDateTime: -1 });

  let sequenceNumber = 1;
  if (latestEncounter) {
    // Simple increment based on count
    const todayCount = await Encounter.countDocuments({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      auditCreatedDateTime: {
        $gte: new Date(year, today.getMonth(), today.getDate()),
        $lt: new Date(year, today.getMonth(), today.getDate() + 1),
      },
    });
    sequenceNumber = todayCount + 1;
  }

  return `${prefix}-${String(sequenceNumber).padStart(4, "0")}`;
}
