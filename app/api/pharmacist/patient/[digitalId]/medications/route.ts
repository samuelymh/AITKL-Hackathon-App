import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { validatePharmacistAccess } from "@/lib/utils/auth-utils";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/response-utils";
import { PrescriptionStatus, DispensationStatus } from "@/lib/constants";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import Encounter from "@/lib/models/Encounter";

// Helper function to check authorization grant
async function verifyAuthorizationGrant(patient: any, organizationId: any) {
  const activeGrant = await AuthorizationGrant.findOne({
    userId: patient._id,
    organizationId: organizationId,
    $or: [
      { "grantDetails.status": "ACTIVE", "grantDetails.expiresAt": { $gt: new Date() } },
      { status: "approved", expiresAt: { $gt: new Date() } },
    ],
  });

  if (!activeGrant) {
    throw new Error("No active authorization found for this patient");
  }

  const canViewPrescriptions =
    activeGrant.accessScope?.canViewPrescriptions || activeGrant.permissions?.canViewPrescriptions;

  if (!canViewPrescriptions) {
    throw new Error("Authorization does not include prescription access");
  }

  return activeGrant;
}

// Helper function to get patient name safely
async function getPatientName(patient: any): Promise<string> {
  try {
    if (!patient.personalInfo?.firstName && !patient.personalInfo?.lastName) {
      return "Patient";
    }

    const { encryptionService, encryptionUtils } = await import("@/lib/services/encryption-service");

    const safeDecrypt = async (field: any): Promise<string> => {
      if (encryptionUtils.isEncrypted(field)) {
        return await encryptionService.decryptField(field);
      }
      return typeof field === "string" ? field : "";
    };

    const firstName = await safeDecrypt(patient.personalInfo.firstName);
    const lastName = await safeDecrypt(patient.personalInfo.lastName);

    return firstName || lastName ? `${firstName} ${lastName}`.trim() : "Patient";
  } catch (error) {
    console.warn("Could not decrypt patient name:", error);
    return "Patient";
  }
}

// Helper function to transform prescriptions - Fixed N+1 query issue
async function transformPrescriptions(encounters: any[]) {
  const Dispensation = (await import("@/lib/models/Dispensation")).default;

  // Collect all encounter IDs for batch query
  const encounterIds = encounters.map((encounter) => encounter._id);

  // Batch query all dispensations at once to avoid N+1
  const allDispensations = await Dispensation.find({
    "prescriptionRef.encounterId": { $in: encounterIds },
  });

  // Create a map for quick lookup
  const dispensationMap = new Map();
  allDispensations.forEach((dispensation) => {
    const key = `${dispensation.prescriptionRef.encounterId}_${dispensation.prescriptionRef.prescriptionIndex}`;
    dispensationMap.set(key, dispensation);
  });

  const medications = [];

  for (const encounter of encounters) {
    if (!encounter.prescriptions?.length) continue;

    for (let i = 0; i < encounter.prescriptions.length; i++) {
      const prescription = encounter.prescriptions[i];
      const dispensationKey = `${encounter._id}_${i}`;
      const existingDispensation = dispensationMap.get(dispensationKey);

      medications.push({
        id: `${encounter._id}_${i}`,
        encounterId: encounter._id,
        prescriptionIndex: i,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        notes: prescription.notes || "",
        status: prescription.status,
        issuedAt: prescription.issuedAt,
        prescribedBy: {
          practitionerId: prescription.prescribingPractitionerId,
        },
        encounter: {
          date: encounter.encounter.encounterDate,
          chiefComplaint: encounter.encounter.chiefComplaint,
          encounterType: encounter.encounter.encounterType,
        },
        dispensationStatus: existingDispensation ? DispensationStatus.DISPENSED : DispensationStatus.PENDING,
        dispensedAt: existingDispensation?.dispensationDetails?.fillDate,
        canDispense: !existingDispensation && prescription.status === PrescriptionStatus.ISSUED,
      });
    }
  }

  return medications;
}

/**
 * GET /api/pharmacist/patient/[digitalId]/medications
 * Get patient's prescriptions that can be dispensed by pharmacist
 * Requires active authorization grant and proper permissions
 */
async function getPatientMedicationsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Extract digitalId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const digitalId = pathSegments[pathSegments.indexOf("patient") + 1];

    if (!digitalId) {
      return createErrorResponse("Patient digital ID is required", 400);
    }

    // Validate pharmacist access using shared utility
    const { patient, organizationMember } = await validatePharmacistAccess(authContext, digitalId);

    // Verify authorization grant
    const activeGrant = await verifyAuthorizationGrant(patient, organizationMember.organizationId);

    // Get encounters with prescriptions
    const encounters = await Encounter.find({
      userId: patient._id,
      "prescriptions.0": { $exists: true },
    }).sort({ "encounter.encounterDate": -1 });

    // Transform prescription data
    const medications = await transformPrescriptions(encounters);

    // Get patient info
    const patientName = await getPatientName(patient);
    const patientInfo = {
      digitalIdentifier: patient.digitalIdentifier,
      name: patientName,
      dateOfBirth: patient.personalInfo?.dateOfBirth,
    };

    return createSuccessResponse({
      patient: patientInfo,
      medications,
      authorizationGrant: {
        id: activeGrant._id,
        expiresAt: activeGrant.grantDetails.expiresAt,
        accessScope: activeGrant.accessScope,
      },
    });
  } catch (error) {
    console.error("Error fetching patient medications:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createErrorResponse(error.message, 404);
      }
      if (error.message.includes("Authorization")) {
        return createErrorResponse(error.message, 403);
      }
    }

    return createErrorResponse("Failed to fetch patient medications", 500);
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPatientMedicationsHandler);
