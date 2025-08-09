import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { validatePharmacistAccess } from "@/lib/utils/auth-utils";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/response-utils";
import { PrescriptionStatus, DispensationStatus, EncounterStatus, HttpStatus, ErrorMessages } from "@/lib/constants";
import Encounter from "@/lib/models/Encounter";
import { z } from "zod";

// Validation schema for dispensation request
const DispenseRequestSchema = z.object({
  encounterId: z.string(),
  prescriptionIndex: z.number(),
  quantityDispensed: z.string(),
  daysSupply: z.number(),
  notes: z.string().optional(),
  substitutions: z
    .array(
      z.object({
        original: z.string(),
        substitute: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
});

/**
 * POST /api/pharmacist/patient/[digitalId]/dispense
 * Dispense medication to patient
 * Creates dispensation record and updates prescription status
 */
async function dispenseHandler(request: NextRequest, authContext: any) {
  try {
    await connectToDatabase();

    if (!authContext?.userId) {
      return createErrorResponse(ErrorMessages.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
    }

    // Extract digitalId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const digitalId = pathSegments[pathSegments.indexOf("patient") + 1];

    if (!digitalId) {
      return createErrorResponse("Patient digital ID is required", HttpStatus.BAD_REQUEST);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DispenseRequestSchema.parse(body);

    // Validate pharmacist access (using shared utility)
    const { pharmacist, organizationMember } = await validatePharmacistAccess(authContext, digitalId);

    // Find the encounter and verify the prescription exists
    const encounter = await Encounter.findById(validatedData.encounterId);
    if (!encounter) {
      return createErrorResponse("Encounter not found", HttpStatus.NOT_FOUND);
    }

    if (!encounter.prescriptions || validatedData.prescriptionIndex >= encounter.prescriptions.length) {
      return createErrorResponse(ErrorMessages.PRESCRIPTION_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const prescription = encounter.prescriptions[validatedData.prescriptionIndex];

    // Check if prescription can be dispensed (using constant)
    if (prescription.status !== PrescriptionStatus.ISSUED) {
      return createErrorResponse(
        ErrorMessages.CANNOT_DISPENSE + ` Current status: ${prescription.status}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Check if already dispensed
    const Dispensation = (await import("@/lib/models/Dispensation")).default;
    const existingDispensation = await Dispensation.findOne({
      "prescriptionRef.encounterId": encounter._id,
      "prescriptionRef.prescriptionIndex": validatedData.prescriptionIndex,
    });

    if (existingDispensation) {
      return createErrorResponse(ErrorMessages.ALREADY_DISPENSED, HttpStatus.CONFLICT);
    }

    // Create dispensation record (using constant)
    const dispensation = new Dispensation({
      prescriptionRef: {
        encounterId: encounter._id,
        prescriptionIndex: validatedData.prescriptionIndex,
      },
      pharmacyOrganizationId: organizationMember.organizationId,
      dispensingPractitionerId: pharmacist._id,
      dispensationDetails: {
        fillDate: new Date(),
        quantityDispensed: validatedData.quantityDispensed,
        daysSupply: validatedData.daysSupply,
        counselingNotes: validatedData.notes || "",
        substitutions: validatedData.substitutions || [],
      },
      status: DispensationStatus.DISPENSED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await dispensation.save();

    // Update prescription status to FILLED and add dispensation metadata (using constant)
    prescription.status = PrescriptionStatus.FILLED;
    prescription.dispensedAt = new Date();
    prescription.dispensingPractitionerId = pharmacist._id;
    prescription.dispensingOrganizationId = organizationMember.organizationId;

    encounter.prescriptions[validatedData.prescriptionIndex] = prescription;
    encounter.updatedAt = new Date();
    await encounter.save();

    // Create audit log entry
    const AuditLog = (await import("@/lib/models/AuditLog")).default;
    await AuditLog.create({
      userId: encounter.userId,
      actorId: authContext.userId,
      action: {
        type: "UPDATE",
        description: `Prescription dispensed - Encounter cycle completed: ${prescription.medicationName}`,
        resourceType: "Prescription",
        resourceId: encounter._id,
      },
      context: {
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        organizationId: organizationMember.organizationId,
        sessionId: `session-${Date.now()}`,
      },
      metadata: {
        prescriptionIndex: validatedData.prescriptionIndex,
        medicationName: prescription.medicationName,
        quantityDispensed: validatedData.quantityDispensed,
        daysSupply: validatedData.daysSupply,
        substitutions: validatedData.substitutions,
        dispensationId: dispensation._id,
        encounterNumber: encounter.encounter?.encounterNumber,
        encounterCycleCompleted: true,
      },
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return createSuccessResponse({
      dispensationId: dispensation._id,
      prescriptionStatus: PrescriptionStatus.FILLED,
      dispensedAt: dispensation.dispensationDetails.fillDate,
      encounterCycleCompleted: true,
      message: "Prescription dispensed successfully - Encounter cycle completed",
    });
  } catch (error) {
    console.error("Error dispensing prescription:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse("Invalid dispensation data", 400);
    }

    // Handle validation errors from shared utilities
    if (error instanceof Error) {
      return createErrorResponse(error.message, 404);
    }

    return createErrorResponse("Failed to dispense prescription", 500);
  }
}

// Export with authentication middleware
export const POST = withMedicalStaffAuth(dispenseHandler);
