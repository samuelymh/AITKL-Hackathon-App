import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
import Encounter from "@/lib/models/Encounter";
import User from "@/lib/models/User";
import { AuditHelper } from "@/lib/models/SchemaUtils";
import { PrescriptionStatus } from "@/lib/constants";
import { z } from "zod";
import mongoose from "mongoose";

// Validation schema
const VerifyPrescriptionSchema = z.object({
  qrCodeData: z.string().min(1, "QR code data is required"),
  pharmacyOrganizationId: z.string().optional(),
});

const DispensePrescriptionSchema = z.object({
  dispensedMedications: z.array(
    z.object({
      medicationName: z.string(),
      quantityDispensed: z.string(),
      lotNumber: z.string().optional(),
      expirationDate: z.string().optional(),
      substitutions: z
        .array(
          z.object({
            original: z.string(),
            substitute: z.string(),
            reason: z.string(),
          })
        )
        .optional(),
    })
  ),
  dispensingNotes: z.string().optional(),
});

/**
 * POST /api/pharmacist/prescriptions/verify
 * Verify prescription QR code and get prescription details
 */
async function verifyPrescriptionHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { qrCodeData } = VerifyPrescriptionSchema.parse(body);

    // Decode QR code data
    let prescriptionData;
    try {
      const decodedData = Buffer.from(qrCodeData, "base64").toString("utf-8");
      prescriptionData = JSON.parse(decodedData);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid QR code format",
        },
        { status: 400 }
      );
    }

    if (prescriptionData.type !== "prescription") {
      return NextResponse.json(
        {
          error: "QR code is not a prescription",
        },
        { status: 400 }
      );
    }

    // Find the encounter and prescription
    const encounter = await Encounter.findById(prescriptionData.encounterId).populate([
      {
        path: "userId",
        select: "personalInfo digitalIdentifier medicalInfo",
      },
      {
        path: "organizationId",
        select: "organizationInfo",
      },
      {
        path: "attendingPractitionerId",
        select: "personalInfo professionalInfo",
      },
    ]);

    if (!encounter) {
      return NextResponse.json(
        {
          error: "Prescription encounter not found",
        },
        { status: 404 }
      );
    }

    const prescriptionIndex = prescriptionData.prescriptionIndex;
    if (prescriptionIndex >= encounter.prescriptions.length) {
      return NextResponse.json(
        {
          error: "Prescription not found in encounter",
        },
        { status: 404 }
      );
    }

    const prescription = encounter.prescriptions[prescriptionIndex];

    // Verify prescription hasn't been cancelled
    if (prescription.status === "CANCELLED") {
      return NextResponse.json(
        {
          error: "This prescription has been cancelled",
        },
        { status: 400 }
      );
    }

    // Find the pharmacist's practitioner record
    const pharmacist = await getPractitionerByUserId(authContext.userId);
    if (!pharmacist) {
      return NextResponse.json({ error: "Pharmacist not found" }, { status: 404 });
    }

    // Check pharmacist's organization membership
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const pharmacistMembership = await OrganizationMember.findOne({
      practitionerId: pharmacist._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    }).populate("organizationId");

    if (!pharmacistMembership) {
      return NextResponse.json(
        {
          error: "Pharmacist not associated with any organization",
        },
        { status: 404 }
      );
    }

    // Get drug interaction warnings (simplified for now)
    const warnings = {
      interactions: [],
      allergies: "No known conflicts", // This would check against patient allergies
    };

    // Check for allergy conflicts
    const patientAllergies = encounter.userId?.medicalInfo?.knownAllergies || [];
    const medicationName = prescription.medicationName.toLowerCase();

    for (const allergy of patientAllergies) {
      if (medicationName.includes(allergy.toLowerCase())) {
        warnings.allergies = `⚠️ ALLERGY ALERT: Patient is allergic to ${allergy}`;
        break;
      }
    }

    const prescriptionDetails = {
      prescriptionId: `${encounter._id}-${prescriptionIndex}`,
      patient: {
        name:
          encounter.userId?.personalInfo?.firstName && encounter.userId?.personalInfo?.lastName
            ? `${encounter.userId.personalInfo.firstName} ${encounter.userId.personalInfo.lastName}`
            : `Patient ${encounter.userId?.digitalIdentifier}`,
        digitalIdentifier: encounter.userId?.digitalIdentifier,
        dateOfBirth: encounter.userId?.personalInfo?.dateOfBirth,
        allergies: patientAllergies,
      },
      prescribingDoctor: {
        name: encounter.attendingPractitionerId?.personalInfo
          ? `${encounter.attendingPractitionerId.personalInfo.firstName} ${encounter.attendingPractitionerId.personalInfo.lastName}`
          : "Unknown",
        specialty: encounter.attendingPractitionerId?.professionalInfo?.specialty,
        licenseNumber: encounter.attendingPractitionerId?.professionalInfo?.licenseNumber,
      },
      hospital: encounter.organizationId?.organizationInfo?.name,
      prescription: {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        instructions: prescription.notes,
        status: prescription.status,
        issuedAt: prescription.issuedAt,
      },
      encounter: {
        date: encounter.encounter.encounterDate,
        type: encounter.encounter.encounterType,
        chiefComplaint: encounter.encounter.chiefComplaint,
      },
      warnings,
      pharmacy: {
        name: pharmacistMembership.organizationId.organizationInfo?.name,
        pharmacist: `${pharmacist.personalInfo.firstName} ${pharmacist.personalInfo.lastName}`,
        verifiedAt: new Date(),
      },
    };

    // Log verification for audit trail
    AuditHelper.logAccess({
      userId: encounter.userId._id.toString(),
      accessedBy: authContext.userId,
      action: "VERIFY_PRESCRIPTION",
      resource: "prescription",
      resourceId: `${encounter._id}-${prescriptionIndex}`,
      details: {
        encounterId: encounter._id.toString(),
        prescriptionIndex,
        medicationName: prescription.medicationName,
        pharmacistId: pharmacist._id.toString(),
        pharmacyId: pharmacistMembership.organizationId._id.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: prescriptionDetails,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error verifying prescription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify prescription",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pharmacist/prescriptions/[prescriptionId]/dispense
 * Mark prescription as dispensed
 */
async function dispensePrescriptionHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract prescription ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const prescriptionIdIndex = pathSegments.findIndex((segment) => segment === "prescriptions") + 1;
    const prescriptionId = pathSegments[prescriptionIdIndex];

    if (!prescriptionId) {
      return NextResponse.json({ error: "Prescription ID is required" }, { status: 400 });
    }

    // Parse prescription ID (format: encounterId-prescriptionIndex)
    const [encounterId, prescriptionIndex] = prescriptionId.split("-");

    if (!encounterId || !prescriptionIndex || !mongoose.Types.ObjectId.isValid(encounterId)) {
      return NextResponse.json({ error: "Invalid prescription ID format" }, { status: 400 });
    }

    const body = await request.json();
    const dispensationData = DispensePrescriptionSchema.parse(body);

    // Find the encounter
    const encounter = await Encounter.findById(encounterId);
    if (!encounter) {
      return NextResponse.json({ error: "Prescription encounter not found" }, { status: 404 });
    }

    const prescIndex = parseInt(prescriptionIndex);
    if (prescIndex >= encounter.prescriptions.length) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // Update prescription status
    await encounter.updatePrescriptionStatus(prescIndex, PrescriptionStatus.FILLED, authContext.userId);

    // Find the pharmacist
    const pharmacist = await getPractitionerByUserId(authContext.userId);
    if (!pharmacist) {
      return NextResponse.json({ error: "Pharmacist not found" }, { status: 404 });
    }

    // Get pharmacist's organization
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const pharmacistMembership = await OrganizationMember.findOne({
      practitionerId: pharmacist._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (!pharmacistMembership) {
      return NextResponse.json(
        {
          error: "Pharmacist not associated with any organization",
        },
        { status: 404 }
      );
    }

    // Create dispensation record
    const Dispensation = (await import("@/lib/models/Dispensation")).default;
    const dispensation = new Dispensation({
      prescriptionRef: {
        encounterId: new mongoose.Types.ObjectId(encounterId),
        prescriptionIndex: prescIndex,
      },
      pharmacyOrganizationId: pharmacistMembership.organizationId,
      dispensingPractitionerId: pharmacist._id,
      dispensationDetails: {
        fillDate: new Date(),
        quantityDispensed: dispensationData.dispensedMedications[0]?.quantityDispensed || "As prescribed",
        lotNumber: dispensationData.dispensedMedications[0]?.lotNumber,
        expirationDate: dispensationData.dispensedMedications[0]?.expirationDate
          ? new Date(dispensationData.dispensedMedications[0].expirationDate)
          : undefined,
        substitutions: dispensationData.dispensedMedications[0]?.substitutions || [],
        counselingNotes: dispensationData.dispensingNotes,
      },
      auditCreatedBy: authContext.userId,
      auditCreatedDateTime: new Date(),
    });

    await dispensation.save();

    // Log dispensation for audit trail
    AuditHelper.logAccess({
      userId: encounter.userId.toString(),
      accessedBy: authContext.userId,
      action: "DISPENSE_PRESCRIPTION",
      resource: "prescription",
      resourceId: prescriptionId,
      details: {
        encounterId,
        prescriptionIndex: prescIndex,
        dispensationId: dispensation._id.toString(),
        medicationName: encounter.prescriptions[prescIndex].medicationName,
        pharmacistId: pharmacist._id.toString(),
        pharmacyId: pharmacistMembership.organizationId.toString(),
        quantityDispensed: dispensationData.dispensedMedications[0]?.quantityDispensed,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        prescription: encounter.prescriptions[prescIndex],
        dispensation,
        message: "Prescription dispensed successfully",
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error dispensing prescription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid dispensation data",
          details: error.errors,
          timestamp: new Date(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to dispense prescription",
        timestamp: new Date(),
      },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const POST = withMedicalStaffAuth(verifyPrescriptionHandler);
