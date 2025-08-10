import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { auditLogger } from "@/lib/services/audit-logger";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Encounter from "@/lib/models/Encounter";
import Organization from "@/lib/models/Organization";
import Practitioner from "@/lib/models/Practitioner";
import { z } from "zod";

// Validation schema for encounter creation
const CreateEncounterSchema = z.object({
  patientDigitalId: z.string().min(1, "Patient digital ID is required"),
  grantId: z.string().optional(),
  encounter: z.object({
    chiefComplaint: z.string().min(1, "Chief complaint is required").max(500),
    encounterType: z
      .string()
      .min(1, "Encounter type is required")
      .transform((type) => {
        // Map frontend encounter types to enum values
        const typeMapping: { [key: string]: string } = {
          "Initial Consultation": "CONSULTATION",
          "Follow-up Visit": "FOLLOW_UP",
          "Annual Physical": "ROUTINE",
          "Urgent Care": "EMERGENCY",
          "Emergency Visit": "EMERGENCY",
          Procedure: "ROUTINE",
          "Lab Review": "FOLLOW_UP",
          "Medication Management": "FOLLOW_UP",
          "Specialist Consultation": "CONSULTATION",
        };
        return typeMapping[type] || "ROUTINE";
      }),
    encounterDate: z
      .string()
      .transform((str) => new Date(str))
      .optional(),
    historyOfPresentIllness: z.string().optional(),
    physicalExamination: z.string().optional(),
    assessmentAndPlan: z.string().optional(),
    vitals: z
      .object({
        temperature: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val === "") return undefined;
            const fahrenheit = Number(val);
            if (isNaN(fahrenheit)) return undefined;
            // Convert Fahrenheit to Celsius: (°F - 32) × 5/9
            const celsius = ((fahrenheit - 32) * 5) / 9;
            return parseFloat(celsius.toFixed(1)); // Round to 1 decimal place
          }),
        bloodPressure: z.string().optional(),
        heartRate: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val === "") return undefined;
            const num = Number(val);
            return !isNaN(num) ? num : undefined;
          }),
        weight: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val === "") return undefined;
            const num = Number(val);
            return !isNaN(num) ? num : undefined;
          }),
        height: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val === "") return undefined;
            const num = Number(val);
            return !isNaN(num) ? num : undefined;
          }),
        oxygenSaturation: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || val === "") return undefined;
            const num = Number(val);
            return !isNaN(num) ? num : undefined;
          }),
      })
      .optional(),
  }),
  diagnoses: z
    .array(
      z.object({
        code: z.string().min(1, "Diagnosis code is required"),
        description: z.string().min(1, "Diagnosis description is required").max(200),
        notes: z.string().max(500).optional().default(""),
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
        duration: z.string().optional(),
        notes: z.string().max(500).optional().default(""),
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

    console.log("👤 Patient found:", {
      id: patient._id,
      digitalId: patient.digitalIdentifier,
      name: `${String(patient.personalInfo?.firstName || "")} ${String(patient.personalInfo?.lastName || "")}`.trim(),
    });

    // Find the doctor's practitioner record
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    console.log("👨‍⚕️ Practitioner found:", {
      id: practitioner._id,
      userId: authContext.userId,
    });

    // Find the doctor's organization membership
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (!organizationMember) {
      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    console.log("🏥 Organization member found:", {
      id: organizationMember._id,
      organizationId: organizationMember.organizationId,
      status: organizationMember.status,
    });

    // Check for active authorization grant with encounter creation permission
    let activeGrant;

    // First, try to find the grant by the specific grantId if provided
    if (validatedData.grantId) {
      console.log("🔍 Looking for specific grant:", validatedData.grantId);
      activeGrant = await AuthorizationGrant.findOne({
        _id: validatedData.grantId,
        userId: patient._id,
        "grantDetails.status": "ACTIVE",
        "grantDetails.expiresAt": { $gt: new Date() },
        "accessScope.canCreateEncounters": true,
      });
    }

    // If no specific grant found or no grantId provided, look for any active grant
    if (!activeGrant) {
      console.log("🔍 Looking for any active grant for patient:", patient.digitalIdentifier);
      activeGrant = await AuthorizationGrant.findOne({
        userId: patient._id,
        organizationId: organizationMember.organizationId,
        "grantDetails.status": "ACTIVE",
        "grantDetails.expiresAt": { $gt: new Date() },
        "accessScope.canCreateEncounters": true,
      });
    }

    console.log("🔍 Active grant found:", activeGrant ? "YES" : "NO");
    if (activeGrant) {
      console.log("📋 Grant details:", {
        id: activeGrant._id,
        status: activeGrant.grantDetails.status,
        expiresAt: activeGrant.grantDetails.expiresAt,
        canCreateEncounters: activeGrant.accessScope.canCreateEncounters,
        organizationId: activeGrant.organizationId,
      });
    }

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
        notes:
          [
            validatedData.encounter.historyOfPresentIllness &&
              `History of Present Illness: ${validatedData.encounter.historyOfPresentIllness}`,
            validatedData.encounter.physicalExamination &&
              `Physical Examination: ${validatedData.encounter.physicalExamination}`,
            validatedData.encounter.assessmentAndPlan &&
              `Assessment & Plan: ${validatedData.encounter.assessmentAndPlan}`,
          ]
            .filter(Boolean)
            .join("\n\n") || "Clinical notes not provided", // Ensure notes is never empty
        encounterDate: validatedData.encounter.encounterDate || new Date(),
        encounterType: validatedData.encounter.encounterType,
        vitals: validatedData.encounter.vitals
          ? Object.fromEntries(
              Object.entries(validatedData.encounter.vitals).filter(([_, value]) => value !== undefined)
            )
          : undefined,
      },
      diagnoses:
        validatedData.diagnoses?.map((diagnosis) => ({
          code: diagnosis.code,
          description: diagnosis.description,
          notes: diagnosis.notes || "",
          isChronic: diagnosis.isChronic,
          diagnosedAt: new Date(),
        })) || [],
      prescriptions:
        validatedData.prescriptions?.map((prescription) => ({
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          notes: prescription.notes || "",
          status: "ISSUED",
          prescribingPractitionerId: practitioner._id,
          issuedAt: new Date(),
        })) || [],
    };

    // Create the encounter
    const encounter = await Encounter.createEncounter(encounterData, authContext.userId);

    // Generate prescription QR codes if prescriptions exist
    const prescriptionsWithQR = await Promise.all(
      encounter.prescriptions.map(async (prescription, index) => {
        try {
          const prescriptionQRData = {
            encounterId: encounter._id.toString(),
            prescriptionIndex: index,
            medication: {
              name: prescription.medicationName,
              dosage: prescription.dosage,
              frequency: prescription.frequency,
            },
            patient: {
              digitalId: validatedData.patientDigitalId,
            },
            prescriber: {
              id: practitioner._id.toString(),
              licenseNumber: practitioner.licenseNumber || "",
            },
            organization: {
              id: organizationMember.organizationId.toString(),
              name: "Organization", // TODO: Get actual organization name
            },
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          };

          const qrCodeDataURL = await QRCodeService.generatePrescriptionQR(prescriptionQRData);

          return {
            medicationName: prescription.medicationName,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            notes: prescription.notes,
            status: prescription.status,
            issuedAt: prescription.issuedAt,
            qrCode: qrCodeDataURL,
          };
        } catch (qrError) {
          console.error("Error generating QR code for prescription:", qrError);
          return {
            medicationName: prescription.medicationName,
            dosage: prescription.dosage,
            frequency: prescription.frequency,
            notes: prescription.notes,
            status: prescription.status,
            issuedAt: prescription.issuedAt,
            qrCode: null,
            qrError: "Failed to generate QR code",
          };
        }
      })
    );

    // Log the encounter creation for audit trail
    try {
      const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

      await auditLogger.log({
        userId: authContext.userId,
        userRole: authContext.user?.role || "doctor",
        digitalIdentifier: patient.digitalIdentifier,
        action: "CREATE_ENCOUNTER",
        resource: "encounter",
        method: "POST",
        endpoint: "/api/doctor/encounters",
        ip: clientIP,
        userAgent: request.headers.get("user-agent") || "unknown",
        statusCode: 201,
        success: true,
        details: {
          encounterId: encounter._id.toString(),
          encounterType: encounter.encounter.encounterType,
          chiefComplaint: encounter.encounter.chiefComplaint,
          diagnosesCount: encounter.diagnoses.length,
          prescriptionsCount: encounter.prescriptions.length,
          practitionerId: practitioner._id.toString(),
          authorizationGrantId: activeGrant._id.toString(),
          organizationId: organizationMember.organizationId.toString(),
        },
      });
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
      // Don't fail the encounter creation if audit logging fails
    }

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
        digitalIdentifier: (encounter.userId as any)?.digitalIdentifier,
        name:
          (encounter.userId as any)?.personalInfo?.firstName && (encounter.userId as any)?.personalInfo?.lastName
            ? `${(encounter.userId as any).personalInfo.firstName} ${(encounter.userId as any).personalInfo.lastName}`
            : `Patient ${(encounter.userId as any)?.digitalIdentifier}`,
      },
      encounter: {
        date: encounter.encounter.encounterDate,
        type: encounter.encounter.encounterType,
        chiefComplaint: encounter.encounter.chiefComplaint,
      },
      organization: (encounter.organizationId as any)?.organizationInfo?.name,
      diagnosesCount: encounter.diagnoses.length,
      prescriptionsCount: encounter.prescriptions.length,
      createdAt: (encounter as any).createdAt,
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
