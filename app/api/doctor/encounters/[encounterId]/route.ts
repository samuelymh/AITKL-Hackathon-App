import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import Encounter from "@/lib/models/Encounter";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import mongoose from "mongoose";

/**
 * GET /api/doctor/encounters/[encounterId]
 * Get specific encounter details for authorized doctor
 */
async function getEncounterDetailsHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract encounterId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const encounterId = pathSegments[pathSegments.length - 1];

    if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
      return NextResponse.json({ error: "Invalid encounter ID" }, { status: 400 });
    }

    // Find the encounter
    const encounter = await Encounter.findById(encounterId).populate([
      {
        path: "userId",
        select: "personalInfo digitalIdentifier medicalInfo",
      },
      {
        path: "organizationId",
        select: "organizationInfo address contact",
      },
      {
        path: "attendingPractitionerId",
        select: "personalInfo professionalInfo",
      },
      {
        path: "authorizationGrantId",
      },
    ]);

    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    // Find the doctor's practitioner record
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    // Check if the doctor has access to this encounter
    // Either they are the attending practitioner, or they have authorization for the patient
    const isAttendingPractitioner = encounter.attendingPractitionerId._id.equals(practitioner._id);

    let hasAuthorization = false;
    if (!isAttendingPractitioner) {
      // Find the doctor's organization membership
      const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
      const organizationMember = await OrganizationMember.findOne({
        practitionerId: practitioner._id,
        status: { $in: ["active", "pending", "pending_verification"] },
      });

      if (organizationMember) {
        // Check for active authorization grant
        const activeGrant = await AuthorizationGrant.findOne({
          userId: encounter.userId._id,
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

        hasAuthorization = !!activeGrant;
      }
    }

    if (!isAttendingPractitioner && !hasAuthorization) {
      return NextResponse.json(
        {
          error: "No authorization to view this encounter",
        },
        { status: 403 }
      );
    }

    // Format encounter details for response
    const encounterDetails = {
      id: encounter._id,
      patient: {
        digitalIdentifier: encounter.userId?.digitalIdentifier,
        name:
          encounter.userId?.personalInfo?.firstName && encounter.userId?.personalInfo?.lastName
            ? `${encounter.userId.personalInfo.firstName} ${encounter.userId.personalInfo.lastName}`
            : `Patient ${encounter.userId?.digitalIdentifier}`,
        dateOfBirth: encounter.userId?.personalInfo?.dateOfBirth,
        bloodType: encounter.userId?.medicalInfo?.bloodType,
        allergies: encounter.userId?.medicalInfo?.knownAllergies || [],
        emergencyContact: encounter.userId?.medicalInfo?.emergencyContact,
      },
      encounter: {
        chiefComplaint: encounter.encounter.chiefComplaint,
        notes: encounter.encounter.notes, // This will be decrypted by the model if user has access
        encounterDate: encounter.encounter.encounterDate,
        encounterType: encounter.encounter.encounterType,
        vitals: encounter.encounter.vitals,
      },
      diagnoses: encounter.diagnoses.map((diagnosis) => ({
        code: diagnosis.code,
        description: diagnosis.description,
        notes: diagnosis.notes,
        isChronic: diagnosis.isChronic,
        diagnosedAt: diagnosis.diagnosedAt,
      })),
      prescriptions: encounter.prescriptions.map((prescription, index) => {
        // Generate QR code for prescription
        const prescriptionQRData = {
          type: "prescription",
          encounterId: encounter._id.toString(),
          prescriptionIndex: index,
          patientDigitalId: encounter.userId?.digitalIdentifier,
          verificationHash: `${encounter._id}-${index}-${prescription.issuedAt.getTime()}`,
        };

        return {
          id: `${encounter._id}-${index}`,
          medicationName: prescription.medicationName,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          notes: prescription.notes,
          status: prescription.status,
          issuedAt: prescription.issuedAt,
          qrCode: Buffer.from(JSON.stringify(prescriptionQRData)).toString("base64"),
        };
      }),
      organization: {
        name: encounter.organizationId?.organizationInfo?.name,
        type: encounter.organizationId?.organizationInfo?.type,
        address: encounter.organizationId?.address,
        contact: encounter.organizationId?.contact,
      },
      attendingPractitioner: {
        name: encounter.attendingPractitionerId?.personalInfo
          ? `${encounter.attendingPractitionerId.personalInfo.firstName} ${encounter.attendingPractitionerId.personalInfo.lastName}`
          : "Unknown",
        specialty: encounter.attendingPractitionerId?.professionalInfo?.specialty,
        licenseNumber: encounter.attendingPractitionerId?.professionalInfo?.licenseNumber,
      },
      authorizationGrant: encounter.authorizationGrantId,
      metadata: {
        createdAt: encounter.createdAt,
        updatedAt: encounter.updatedAt,
        isAttendingPractitioner,
        hasAuthorization,
      },
    };

    // Log access for audit trail
    AuditHelper.logAccess({
      userId: encounter.userId._id.toString(),
      accessedBy: authContext.userId,
      action: "VIEW_ENCOUNTER",
      resource: "encounter",
      resourceId: encounter._id.toString(),
      details: {
        encounterId: encounter._id.toString(),
        encounterDate: encounter.encounter.encounterDate,
        practitionerId: practitioner._id.toString(),
        accessType: isAttendingPractitioner ? "attending_practitioner" : "authorized_access",
      },
    });

    return NextResponse.json({
      success: true,
      data: encounterDetails,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching encounter details:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch encounter details",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctor/encounters/[encounterId]
 * Update encounter details (only by attending practitioner)
 */
async function updateEncounterHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract encounterId from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const encounterId = pathSegments[pathSegments.length - 1];

    if (!encounterId || !mongoose.Types.ObjectId.isValid(encounterId)) {
      return NextResponse.json({ error: "Invalid encounter ID" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { notes, vitals, diagnoses, prescriptions } = body;

    // Find the encounter
    const encounter = await Encounter.findById(encounterId);
    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    // Find the doctor's practitioner record
    const practitioner = await getPractitionerByUserId(authContext.userId);
    if (!practitioner) {
      return NextResponse.json({ error: "Doctor practitioner not found" }, { status: 404 });
    }

    // Only the attending practitioner can update the encounter
    if (!encounter.attendingPractitionerId.equals(practitioner._id)) {
      return NextResponse.json(
        {
          error: "Only the attending practitioner can update this encounter",
        },
        { status: 403 }
      );
    }

    // Update encounter fields
    if (notes !== undefined) {
      encounter.encounter.notes = notes;
    }

    if (vitals !== undefined) {
      encounter.encounter.vitals = { ...encounter.encounter.vitals, ...vitals };
    }

    // Add new diagnoses
    if (diagnoses && Array.isArray(diagnoses)) {
      for (const diagnosis of diagnoses) {
        await encounter.addDiagnosis(diagnosis, authContext.userId);
      }
    }

    // Add new prescriptions
    if (prescriptions && Array.isArray(prescriptions)) {
      for (const prescription of prescriptions) {
        await encounter.addPrescription(
          {
            ...prescription,
            prescribingPractitionerId: practitioner._id,
          },
          authContext.userId
        );
      }
    }

    // Save the encounter if basic fields were updated
    if (notes !== undefined || vitals !== undefined) {
      encounter.auditModifiedBy = authContext.userId;
      await encounter.save();
    }

    // Log the update for audit trail
    AuditHelper.logAccess({
      userId: encounter.userId.toString(),
      accessedBy: authContext.userId,
      action: "UPDATE_ENCOUNTER",
      resource: "encounter",
      resourceId: encounter._id.toString(),
      details: {
        encounterId: encounter._id.toString(),
        updatedFields: {
          notes: notes !== undefined,
          vitals: vitals !== undefined,
          newDiagnoses: diagnoses?.length || 0,
          newPrescriptions: prescriptions?.length || 0,
        },
        practitionerId: practitioner._id.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        encounter: await encounter.toPractitionerJSON(),
        message: "Encounter updated successfully",
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error updating encounter:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update encounter",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const GET = withMedicalStaffAuth(getEncounterDetailsHandler);
export const PUT = withMedicalStaffAuth(updateEncounterHandler);
