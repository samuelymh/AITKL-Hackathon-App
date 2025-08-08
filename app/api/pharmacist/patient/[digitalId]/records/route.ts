import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { validatePharmacistAccess } from "@/lib/utils/auth-utils";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/response-utils";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import Encounter from "@/lib/models/Encounter";

// Remove duplicate validatePharmacistAccess function since we're using the shared one

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

  const canViewMedicalHistory = activeGrant.accessScope?.canViewMedicalHistory;

  if (!canViewMedicalHistory) {
    throw new Error("Authorization does not include medical history access");
  }

  return activeGrant;
}

// Helper function to process encrypted allergies and medical data
async function processEncryptedMedicalData(knownAllergies: any[], safeDecrypt: (field: any) => Promise<string>) {
  const allergies = { food: [] as string[], drug: [] as string[], other: [] as string[] };
  const medicalConditions: string[] = [];
  const currentMedications: string[] = [];

  for (const allergyItem of knownAllergies) {
    const decrypted = await safeDecrypt(allergyItem);
    if (!decrypted) continue;

    if (decrypted.startsWith("food:")) {
      allergies.food.push(decrypted.replace("food:", ""));
    } else if (decrypted.startsWith("drug:")) {
      allergies.drug.push(decrypted.replace("drug:", ""));
    } else if (decrypted.startsWith("condition:")) {
      medicalConditions.push(decrypted.replace("condition:", ""));
    } else if (decrypted.startsWith("medication:")) {
      currentMedications.push(decrypted.replace("medication:", ""));
    } else {
      allergies.other.push(decrypted);
    }
  }

  return { allergies, medicalConditions, currentMedications };
}

// Helper function to get emergency contact information
async function getEmergencyContactInfo(patient: any, safeDecrypt: (field: any) => Promise<string>) {
  const emergencyContact = {
    name: "",
    phone: "",
    relationship: patient.medicalInfo?.emergencyContact?.relationship || "",
  };

  if (patient.medicalInfo?.emergencyContact?.name) {
    emergencyContact.name = await safeDecrypt(patient.medicalInfo.emergencyContact.name);
  }
  if (patient.medicalInfo?.emergencyContact?.phone) {
    emergencyContact.phone = await safeDecrypt(patient.medicalInfo.emergencyContact.phone);
  }

  return emergencyContact;
}

// Helper function to safely decrypt medical information
async function getDecryptedMedicalInfo(patient: any) {
  try {
    const { encryptionService, encryptionUtils } = await import("@/lib/services/encryption-service");

    const safeDecrypt = async (field: any): Promise<string> => {
      try {
        if (encryptionUtils.isEncrypted(field)) {
          return await encryptionService.decryptField(field);
        }
        return typeof field === "string" ? field : "";
      } catch (error) {
        console.warn("Failed to decrypt field:", error);
        return typeof field === "string" ? field : "";
      }
    };

    // Initialize default values
    let allergies = { food: [] as string[], drug: [] as string[], other: [] as string[] };
    let medicalConditions: string[] = [];
    let currentMedications: string[] = [];

    // Process knownAllergies if they exist
    if (patient.medicalInfo?.knownAllergies && Array.isArray(patient.medicalInfo.knownAllergies)) {
      const processed = await processEncryptedMedicalData(patient.medicalInfo.knownAllergies, safeDecrypt);
      allergies = processed.allergies;
      medicalConditions = processed.medicalConditions;
      currentMedications = processed.currentMedications;
    }

    // Get emergency contact information
    const emergencyContact = await getEmergencyContactInfo(patient, safeDecrypt);

    // Get patient name
    let patientName = "Patient";
    if (patient.personalInfo?.firstName || patient.personalInfo?.lastName) {
      const firstName = await safeDecrypt(patient.personalInfo.firstName);
      const lastName = await safeDecrypt(patient.personalInfo.lastName);
      if (firstName || lastName) {
        patientName = `${firstName} ${lastName}`.trim();
      }
    }

    return {
      patientName,
      bloodType: patient.medicalInfo?.bloodType || "",
      allergies,
      medicalConditions,
      currentMedications,
      smokingStatus: patient.medicalInfo?.smokingStatus || "never",
      emergencyContact,
      additionalNotes: patient.medicalInfo?.additionalNotes || "",
      dateOfBirth: patient.personalInfo?.dateOfBirth,
    };
  } catch (error) {
    console.error("Error decrypting medical information:", error);
    throw new Error("Failed to access patient medical information");
  }
}

// Helper function to get relevant encounter history
async function getRelevantEncounters(patientId: any) {
  // Get recent encounters (last 6 months) that might be relevant for pharmacy
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const encounters = await Encounter.find({
    userId: patientId,
    "encounter.encounterDate": { $gte: sixMonthsAgo },
  })
    .sort({ "encounter.encounterDate": -1 })
    .limit(10); // Limit to most recent 10 encounters

  return encounters.map((encounter) => ({
    id: encounter._id,
    date: encounter.encounter.encounterDate,
    chiefComplaint: encounter.encounter.chiefComplaint,
    encounterType: encounter.encounter.encounterType,
    diagnoses:
      encounter.diagnoses?.map((diagnosis) => ({
        code: diagnosis.code,
        description: diagnosis.description,
        isChronic: diagnosis.isChronic,
      })) || [],
    prescriptionCount: encounter.prescriptions?.length || 0,
  }));
}

/**
 * GET /api/pharmacist/patient/[digitalId]/records
 * Get patient's medical records relevant for pharmacy services
 * Requires active authorization grant and proper permissions
 */
async function getPatientRecordsHandler(request: NextRequest, authContext: any) {
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

    // Get decrypted medical information
    const medicalInfo = await getDecryptedMedicalInfo(patient);

    // Get relevant encounter history
    const recentEncounters = await getRelevantEncounters(patient._id);

    // Prepare response data focused on pharmacy needs
    const patientRecords = {
      patient: {
        digitalIdentifier: patient.digitalIdentifier,
        name: medicalInfo.patientName,
        dateOfBirth: medicalInfo.dateOfBirth,
        bloodType: medicalInfo.bloodType,
      },

      // Critical safety information for pharmacy
      safetyInformation: {
        drugAllergies: medicalInfo.allergies.drug,
        foodAllergies: medicalInfo.allergies.food,
        otherAllergies: medicalInfo.allergies.other,
        currentMedications: medicalInfo.currentMedications,
        medicalConditions: medicalInfo.medicalConditions,
        smokingStatus: medicalInfo.smokingStatus,
      },

      // Emergency contact for critical situations
      emergencyContact: medicalInfo.emergencyContact,

      // Recent medical history relevant to prescriptions
      recentEncounters,

      // Additional notes that might affect medication dispensing
      clinicalNotes: medicalInfo.additionalNotes,

      authorization: {
        grantId: activeGrant._id,
        expiresAt: activeGrant.grantDetails.expiresAt,
        accessScope: activeGrant.accessScope,
      },
    };

    return createSuccessResponse(patientRecords);
  } catch (error) {
    console.error("Error fetching patient records:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createErrorResponse(error.message, 404);
      }
      if (error.message.includes("Authorization")) {
        return createErrorResponse(error.message, 403);
      }
    }

    return createErrorResponse("Failed to fetch patient records", 500);
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPatientRecordsHandler);
