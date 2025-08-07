import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import Encounter from "@/lib/models/Encounter";
import Organization from "@/lib/models/Organization";

/**
 * GET /api/test/add-sample-prescriptions
 * Create sample prescription data for testing
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Find a patient
    const patient = await User.findOne({ "auth.role": "patient" });
    if (!patient) {
      return NextResponse.json({ error: "No patient found" }, { status: 404 });
    }

    // Find a doctor
    const doctorUser = await User.findOne({ "auth.role": "doctor" });
    if (!doctorUser) {
      return NextResponse.json({ error: "No doctor found" }, { status: 404 });
    }

    const doctor = await Practitioner.findOne({ userId: doctorUser._id });
    if (!doctor) {
      return NextResponse.json(
        { error: "No practitioner record found for doctor" },
        { status: 404 },
      );
    }

    // Find an organization
    const organization = await Organization.findOne();
    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Create a sample encounter with prescriptions
    const sampleEncounter = {
      userId: patient._id,
      organizationId: organization._id,
      attendingPractitionerId: doctor._id,
      authorizationGrantId: organization._id,
      encounter: {
        chiefComplaint: "Routine check-up and medication refill",
        notes: { value: "Patient is doing well, needs medication refill" },
        encounterDate: new Date(),
        encounterType: "ROUTINE",
        vitals: {
          temperature: 36.8,
          bloodPressure: "120/80",
          heartRate: 72,
          weight: 70,
          height: 175,
        },
      },
      diagnoses: [
        {
          code: "Z00.00",
          description: "Routine general medical examination",
          notes: "Annual check-up",
          isChronic: false,
          diagnosedAt: new Date(),
        },
      ],
      prescriptions: [
        {
          medicationName: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily with meals",
          notes: "For diabetes management",
          status: "ISSUED",
          prescribingPractitionerId: doctor._id,
          issuedAt: new Date(),
        },
        {
          medicationName: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily in the morning",
          notes: "For blood pressure control",
          status: "ISSUED",
          prescribingPractitionerId: doctor._id,
          issuedAt: new Date(),
        },
        {
          medicationName: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once daily at bedtime",
          notes: "For cholesterol management - urgent refill needed",
          status: "ISSUED",
          prescribingPractitionerId: doctor._id,
          issuedAt: new Date(),
        },
      ],
    };

    const encounter = await Encounter.create(sampleEncounter);

    return NextResponse.json({
      success: true,
      message: "Sample prescriptions created successfully",
      data: {
        encounterId: encounter._id,
        prescriptionsCount: encounter.prescriptions.length,
        prescriptions: encounter.prescriptions.map((p: any) => ({
          id: p._id,
          medicationName: p.medicationName,
          dosage: p.dosage,
          status: p.status,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating sample prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to create sample prescriptions" },
      { status: 500 },
    );
  }
}
