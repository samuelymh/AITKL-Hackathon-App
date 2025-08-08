import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { withMedicalStaffAuth } from "@/lib/middleware/auth";
import { getPractitionerByUserId } from "@/lib/services/practitioner-service";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract digitalId from URL path
    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/");
    const digitalId = pathSegments[pathSegments.indexOf("patient") + 1];

    if (!digitalId) {
      return NextResponse.json({ error: "Patient digital ID is required" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DispenseRequestSchema.parse(body);

    // Find the pharmacist practitioner
    const pharmacist = await getPractitionerByUserId(authContext.userId);
    if (!pharmacist) {
      return NextResponse.json({ error: "Pharmacist not found" }, { status: 404 });
    }

    // Get the pharmacist's organization
    const OrganizationMember = (await import("@/lib/models/OrganizationMember")).default;
    const organizationMember = await OrganizationMember.findOne({
      practitionerId: pharmacist._id,
      status: "active",
    });

    if (!organizationMember) {
      return NextResponse.json({ error: "No active organization membership found" }, { status: 404 });
    }

    // Find the encounter and verify the prescription exists
    const encounter = await Encounter.findById(validatedData.encounterId);
    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    if (!encounter.prescriptions || validatedData.prescriptionIndex >= encounter.prescriptions.length) {
      return NextResponse.json({ error: "Prescription not found in encounter" }, { status: 404 });
    }

    const prescription = encounter.prescriptions[validatedData.prescriptionIndex];

    // Check if prescription can be dispensed
    if (prescription.status !== "ISSUED") {
      return NextResponse.json(
        {
          error: `Prescription cannot be dispensed. Current status: ${prescription.status}`,
        },
        { status: 400 }
      );
    }

    // Check if already dispensed
    const Dispensation = (await import("@/lib/models/Dispensation")).default;
    const existingDispensation = await Dispensation.findOne({
      "prescriptionRef.encounterId": encounter._id,
      "prescriptionRef.prescriptionIndex": validatedData.prescriptionIndex,
    });

    if (existingDispensation) {
      return NextResponse.json(
        {
          error: "Prescription has already been dispensed",
        },
        { status: 400 }
      );
    }

    // Create dispensation record
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
      status: "DISPENSED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await dispensation.save();

    // Update prescription status to FILLED and add dispensation metadata
    prescription.status = "FILLED";
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

    return NextResponse.json({
      success: true,
      data: {
        dispensationId: dispensation._id,
        prescriptionStatus: "FILLED",
        dispensedAt: dispensation.dispensationDetails.fillDate,
        encounterCycleCompleted: true,
        message: "Prescription dispensed successfully - Encounter cycle completed",
      },
    });
  } catch (error) {
    console.error("Error dispensing prescription:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid dispensation data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to dispense prescription" }, { status: 500 });
  }
}

// Export with authentication middleware
export const POST = withMedicalStaffAuth(dispenseHandler);
