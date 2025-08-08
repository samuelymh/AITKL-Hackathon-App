import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Encounter from "@/lib/models/Encounter";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { z } from "zod";

// Validation schema for encounter creation
const CreateEncounterSchema = z.object({
  patientDigitalId: z.string().min(1, "Patient digital ID is required"),
  encounter: z.object({
    chiefComplaint: z.string().min(1, "Chief complaint is required").max(500),
    notes: z.string().min(1, "Clinical notes are required"),
    encounterType: z.enum(["ROUTINE", "EMERGENCY", "FOLLOW_UP", "CONSULTATION"]),
    encounterDate: z
      .string()
      .transform((str) => new Date(str))
      .optional(),
    vitals: z
      .object({
        temperature: z.number().min(30).max(45).optional(),
        bloodPressure: z
          .string()
          .regex(/^\d{2,3}\/\d{2,3}$/)
          .optional(),
        heartRate: z.number().min(30).max(220).optional(),
        weight: z.number().min(0.5).max(500).optional(),
        height: z.number().min(30).max(300).optional(),
      })
      .optional(),
  }),
  diagnoses: z
    .array(
      z.object({
        code: z.string().regex(/^[A-Z]\d{2}\.?\d{0,2}$/, "Invalid ICD-10 code format"),
        description: z.string().min(1).max(200),
        notes: z.string().max(500).optional(),
        isChronic: z.boolean().default(false),
      })
    )
    .optional(),
  prescriptions: z
    .array(
      z.object({
        medicationName: z.string().min(1).max(200),
        dosage: z.string().min(1).max(100),
        frequency: z.string().min(1).max(200),
        quantity: z.string().optional(),
        refills: z.number().min(0).max(10).optional(),
        instructions: z.string().max(500).optional(),
      })
    )
    .optional(),
});

/**
 * POST /api/doctor/encounters
 * Create a new medical encounter
 */
async function createEncounterHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateEncounterSchema.parse(body);

    // Find the patient by digital identifier
    const patient = await User.findOne({
      digitalIdentifier: validatedData.patientDigitalId,
      "auth.role": "patient",
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find the doctor's practitioner record
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    // Find the doctor's organization membership
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (!organizationMember) {
      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    // Check for active authorization grant with encounter creation permission
    const activeGrant = await AuthorizationGrant.findOne({
      userId: patient._id,
      organizationId: organizationMember.organizationId,
      $or: [
        {
          "grantDetails.status": "ACTIVE",
          "grantDetails.expiresAt": { $gt: new Date() },
        },
        {
          status: "approved",
          expiresAt: { $gt: new Date() },
        },
      ],
      $and: [
        {
          $or: [{ "accessScope.canCreateEncounters": true }, { "permissions.canCreateEncounters": true }],
        },
      ],
    });

    if (!activeGrant) {
      return NextResponse.json(
        {
          error: "No active authorization found for creating encounters",
        },
        { status: 403 }
      );
    }

    // Prepare encounter data
    const encounterData = {
      userId: patient._id,
      organizationId: organizationMember.organizationId,
      attendingPractitionerId: practitioner._id,
      authorizationGrantId: activeGrant._id,
      encounter: {
        chiefComplaint: validatedData.encounter.chiefComplaint,
        notes: validatedData.encounter.notes, // Will be encrypted by the model
        encounterDate: validatedData.encounter.encounterDate || new Date(),
        encounterType: validatedData.encounter.encounterType,
        vitals: validatedData.encounter.vitals,
      },
      diagnoses:
        validatedData.diagnoses?.map((diagnosis) => ({
          code: diagnosis.code,
          description: diagnosis.description,
          notes: diagnosis.notes,
          isChronic: diagnosis.isChronic,
          diagnosedAt: new Date(),
        })) || [],
      prescriptions:
        validatedData.prescriptions?.map((prescription) => ({
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          notes: prescription.instructions,
          status: "ISSUED",
          prescribingPractitionerId: practitioner._id,
          issuedAt: new Date(),
        })) || [],
    };

    // Create the encounter
    const encounter = await Encounter.createEncounter(encounterData, authContext.userId);

    // Generate prescription QR codes if prescriptions exist
    const prescriptionsWithQR = encounter.prescriptions.map((prescription, index) => {
      const prescriptionQRData = {
        type: "prescription",
        encounterId: encounter._id.toString(),
        prescriptionIndex: index,
        patientDigitalId: validatedData.patientDigitalId,
        verificationHash: `${encounter._id}-${index}-${Date.now()}`,
      };

      return {
        ...prescription.toObject(),
        qrCode: Buffer.from(JSON.stringify(prescriptionQRData)).toString("base64"),
      };
    });

    // Log the encounter creation for audit trail
    AuditHelper.logAccess({
      userId: patient._id.toString(),
      accessedBy: authContext.userId,
      action: "CREATE_ENCOUNTER",
      resource: "encounter",
      authorizationGrantId: activeGrant._id.toString(),
      organizationId: organizationMember.organizationId.toString(),
      details: {
        encounterId: encounter._id.toString(),
        encounterType: encounter.encounter.encounterType,
        chiefComplaint: encounter.encounter.chiefComplaint,
        diagnosesCount: encounter.diagnoses.length,
        prescriptionsCount: encounter.prescriptions.length,
        practitionerId: practitioner._id.toString(),
      },
    });

    // Prepare response data
    const encounterResponse = await encounter.toPractitionerJSON();

    return NextResponse.json(
      {
        success: true,
        data: {
          encounter: {
            ...encounterResponse,
            prescriptions: prescriptionsWithQR,
          },
          message: "Encounter created successfully",
        },
        timestamp: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating encounter:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid encounter data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create encounter",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctor/encounters
 * Get encounters for the authenticated doctor
 */
async function getDoctorEncountersHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const patientDigitalId = searchParams.get("patientDigitalId");

    // Find the doctor's practitioner record
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    let query: any = {
      attendingPractitionerId: practitioner._id,
      auditDeletedDateTime: { $exists: false },
    };

    // Filter by specific patient if requested
    if (patientDigitalId) {
      const patient = await User.findOne({
        digitalIdentifier: patientDigitalId,
        "auth.role": "patient",
      });

      if (patient) {
        query.userId = patient._id;
      }
    }

    const encounters = await Encounter.find(query)
      .populate([
        {
          path: "userId",
          select: "personalInfo.firstName personalInfo.lastName digitalIdentifier",
        },
        {
          path: "organizationId",
          select: "organizationInfo.name organizationInfo.type",
        },
      ])
      .sort({ "encounter.encounterDate": -1 })
      .limit(limit)
      .skip(offset);

    const totalCount = await Encounter.countDocuments(query);

    const encounterList = encounters.map((encounter) => ({
      id: encounter._id,
      patient: {
        digitalIdentifier: encounter.userId?.digitalIdentifier,
        name:
          encounter.userId?.personalInfo?.firstName && encounter.userId?.personalInfo?.lastName
            ? `${encounter.userId.personalInfo.firstName} ${encounter.userId.personalInfo.lastName}`
            : `Patient ${encounter.userId?.digitalIdentifier}`,
      },
      encounter: {
        date: encounter.encounter.encounterDate,
        type: encounter.encounter.encounterType,
        chiefComplaint: encounter.encounter.chiefComplaint,
      },
      organization: encounter.organizationId?.organizationInfo?.name,
      diagnosesCount: encounter.diagnoses.length,
      prescriptionsCount: encounter.prescriptions.length,
      createdAt: encounter.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        encounters: encounterList,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + encounters.length < totalCount,
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching doctor encounters:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch encounters",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const POST = withMedicalStaffAuth(createEncounterHandler);
export const GET = withMedicalStaffAuth(getDoctorEncountersHandler);
