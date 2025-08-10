import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import { auditLogger } from "@/lib/services/audit-logger";

// Import all models to ensure they are registered
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import User from "@/lib/models/User";
import Encounter from "@/lib/models/Encounter";
import Organization from "@/lib/models/Organization";
import Practitioner from "@/lib/models/Practitioner";
import OrganizationMember from "@/lib/models/OrganizationMember";

/**
 * GET /api/doctor/patients/{digitalId}/medical-history
 * Get patient's medical history for authorized doctor
 */
async function getPatientMedicalHistoryHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract digitalId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const digitalIdIndex = pathSegments.findIndex((segment) => segment === "patients") + 1;
    const digitalId = pathSegments[digitalIdIndex];

    if (!digitalId) {
      return NextResponse.json({ error: "Patient digital ID is required" }, { status: 400 });
    }

    // Find the patient by digital identifier
    const patient = await User.findOne({
      digitalIdentifier: digitalId,
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
    const organizationMember = await OrganizationMember.findOne({
      practitionerId: practitioner._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (!organizationMember) {
      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    // Check for active authorization grant
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
          $or: [{ "accessScope.canViewMedicalHistory": true }, { "permissions.canViewMedicalHistory": true }],
        },
      ],
    });

    if (!activeGrant) {
      return NextResponse.json(
        {
          error: "No active authorization found for viewing medical history",
        },
        { status: 403 }
      );
    }

    // Fetch patient's medical history (encounters)
    // Ensure models are registered by accessing them
    console.log("Ensuring models are registered...");
    console.log("Organization model:", Organization.modelName);
    console.log("Practitioner model:", Practitioner.modelName);

    const encounters = await Encounter.find({
      userId: patient._id,
      auditDeletedDateTime: { $exists: false },
    })
      .populate([
        {
          path: "organizationId",
          model: "Organization", // Explicitly specify the model
          select: "organizationInfo.name organizationInfo.type address",
        },
        {
          path: "attendingPractitionerId",
          model: "Practitioner", // Explicitly specify the model
          select: "personalInfo professionalInfo.specialty",
        },
      ])
      .sort({ "encounter.encounterDate": -1 })
      .limit(50); // Limit to last 50 encounters

    // Get current medications (from latest prescriptions)
    const currentMedications: any[] = [];
    const recentEncounters = encounters.slice(0, 10); // Check last 10 encounters

    for (const encounter of recentEncounters) {
      for (const prescription of encounter.prescriptions) {
        if (prescription.status === "ISSUED" || prescription.status === "FILLED") {
          // Check if medication is not already in the list
          const exists = currentMedications.find(
            (med) =>
              med.medicationName &&
              prescription.medicationName &&
              med.medicationName.toLowerCase() === prescription.medicationName.toLowerCase()
          );

          if (!exists && prescription.medicationName) {
            currentMedications.push({
              medicationName: prescription.medicationName,
              dosage: prescription.dosage,
              frequency: prescription.frequency,
              status: prescription.status,
              prescribedAt: prescription.issuedAt,
              prescribedBy: encounter.attendingPractitionerId,
            });
          }
        }
      }
    }

    // Get chronic conditions
    const chronicConditions: any[] = [];
    for (const encounter of encounters) {
      for (const diagnosis of encounter.diagnoses) {
        if (diagnosis.isChronic) {
          const exists = chronicConditions.find((condition) => condition.code === diagnosis.code);

          if (!exists) {
            chronicConditions.push({
              code: diagnosis.code,
              description: diagnosis.description,
              diagnosedAt: diagnosis.diagnosedAt,
              notes: diagnosis.notes,
            });
          }
        }
      }
    }

    // Format medical history for response
    const medicalHistory = encounters.map((encounter) => ({
      id: encounter._id,
      date: encounter.encounter.encounterDate,
      type: encounter.encounter.encounterType,
      chiefComplaint: encounter.encounter.chiefComplaint,
      organization: (encounter.organizationId as any)?.organizationInfo?.name || "Unknown",
      attendingPhysician: (encounter.attendingPractitionerId as any)?.personalInfo
        ? `${(encounter.attendingPractitionerId as any).personalInfo.firstName} ${(encounter.attendingPractitionerId as any).personalInfo.lastName}`
        : "Unknown",
      specialty: (encounter.attendingPractitionerId as any)?.professionalInfo?.specialty,
      diagnoses: encounter.diagnoses.map((d) => ({
        code: d.code,
        description: d.description,
        isChronic: d.isChronic,
        notes: d.notes,
      })),
      prescriptions: encounter.prescriptions.map((p) => ({
        medication: p.medicationName,
        dosage: p.dosage,
        frequency: p.frequency,
        status: p.status,
      })),
      vitals: encounter.encounter.vitals,
    }));

    // Get patient summary info (non-encrypted fields only)
    const patientSummary = {
      digitalIdentifier: patient.digitalIdentifier,
      userId: patient._id.toString(), // Add the actual user ID for AI context
      // Only include decrypted name if available, otherwise use digital ID
      name:
        patient.personalInfo?.firstName && patient.personalInfo?.lastName
          ? `${patient.personalInfo.firstName} ${patient.personalInfo.lastName}`
          : `Patient ${patient.digitalIdentifier}`,
      dateOfBirth: patient.personalInfo?.dateOfBirth,
      bloodType: patient.medicalInfo?.bloodType,
      allergies: patient.medicalInfo?.knownAllergies || [],
      emergencyContact: patient.medicalInfo?.emergencyContact,
    };

    // Log access for audit trail
    try {
      await auditLogger.logSecurityEvent("DATA_ACCESS", request, authContext.userId, {
        action: "VIEW_MEDICAL_HISTORY",
        resource: "patient_medical_history",
        patientId: patient._id.toString(),
        patientDigitalId: digitalId,
        encountersAccessed: encounters.length,
        practitionerId: practitioner._id.toString(),
        authorizationGrantId: activeGrant._id.toString(),
        organizationId: organizationMember.organizationId.toString(),
      });
    } catch (auditError) {
      console.error("Failed to log audit event:", auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: {
        patient: patientSummary,
        medicalHistory,
        currentMedications,
        chronicConditions,
        summary: {
          totalEncounters: encounters.length,
          lastVisit: encounters.length > 0 ? encounters[0].encounter.encounterDate : null,
          activeGrant: {
            id: activeGrant._id,
            expiresAt: activeGrant.grantDetails?.expiresAt || (activeGrant as any).expiresAt,
            accessScope: activeGrant.accessScope || (activeGrant as any).permissions,
          },
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching patient medical history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch patient medical history",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getPatientMedicalHistoryHandler);
