import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Encounter, { PrescriptionStatus } from "@/lib/models/Encounter";
import User from "@/lib/models/User";
import Practitioner from "@/lib/models/Practitioner";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    console.log("Creating new MongoDB connection...");
    console.log("✅ Successfully connected to MongoDB");

    // First, get the pharmacist practitioner ID
    const pharmacist = await Practitioner.findOne({
      "professionalInfo.practitionerType": "pharmacist",
    });

    if (!pharmacist) {
      return NextResponse.json(
        {
          success: false,
          error: "No pharmacist found in database",
        },
        { status: 404 }
      );
    }

    console.log("Found pharmacist:", pharmacist._id);

    // Create some sample patients (users)
    const samplePatients = [
      {
        digitalIdentifier: `HID_${new mongoose.Types.ObjectId().toString().slice(-8)}-patient-001`,
        personalInfo: {
          firstName: "John",
          lastName: "Doe",
          contact: {
            email: "john.doe@example.com",
            phone: "0123456789",
          },
        },
        role: "patient",
        password: "hashedpassword123",
      },
      {
        digitalIdentifier: `HID_${new mongoose.Types.ObjectId().toString().slice(-8)}-patient-002`,
        personalInfo: {
          firstName: "Jane",
          lastName: "Smith",
          contact: {
            email: "jane.smith@example.com",
            phone: "0123456790",
          },
        },
        role: "patient",
        password: "hashedpassword123",
      },
      {
        digitalIdentifier: `HID_${new mongoose.Types.ObjectId().toString().slice(-8)}-patient-003`,
        personalInfo: {
          firstName: "Bob",
          lastName: "Johnson",
          contact: {
            email: "bob.johnson@example.com",
            phone: "0123456791",
          },
        },
        role: "patient",
        password: "hashedpassword123",
      },
    ];

    // Insert patients
    const patients = await User.insertMany(samplePatients);
    console.log(`Created ${patients.length} sample patients`);

    // Create sample encounters with prescriptions
    const sampleEncounters = [
      {
        userId: patients[0]._id,
        practitionerId: pharmacist._id,
        type: "consultation",
        date: new Date(),
        status: "completed",
        prescriptions: [
          {
            _id: new mongoose.Types.ObjectId(),
            medicationName: "Amoxicillin 500mg",
            dosage: "500mg",
            frequency: "Three times daily",
            duration: "7 days",
            instructions: "Take with food",
            status: PrescriptionStatus.ISSUED,
            prescribingPractitionerId: pharmacist._id,
            issuedAt: new Date(),
            notes: "For bacterial infection",
          },
          {
            _id: new mongoose.Types.ObjectId(),
            medicationName: "Ibuprofen 400mg",
            dosage: "400mg",
            frequency: "As needed",
            duration: "5 days",
            instructions: "Take with food, maximum 3 times daily",
            status: PrescriptionStatus.ISSUED,
            prescribingPractitionerId: pharmacist._id,
            issuedAt: new Date(),
            notes: "For pain relief",
          },
        ],
      },
      {
        userId: patients[1]._id,
        practitionerId: pharmacist._id,
        type: "consultation",
        date: new Date(),
        status: "completed",
        prescriptions: [
          {
            _id: new mongoose.Types.ObjectId(),
            medicationName: "Metformin 500mg",
            dosage: "500mg",
            frequency: "Twice daily",
            duration: "30 days",
            instructions: "Take with meals",
            status: PrescriptionStatus.ISSUED,
            prescribingPractitionerId: pharmacist._id,
            issuedAt: new Date(),
            notes: "For diabetes management",
          },
        ],
      },
      {
        userId: patients[2]._id,
        practitionerId: pharmacist._id,
        type: "consultation",
        date: new Date(),
        status: "completed",
        prescriptions: [
          {
            _id: new mongoose.Types.ObjectId(),
            medicationName: "Lisinopril 10mg",
            dosage: "10mg",
            frequency: "Once daily",
            duration: "30 days",
            instructions: "Take in the morning",
            status: PrescriptionStatus.ISSUED,
            prescribingPractitionerId: pharmacist._id,
            issuedAt: new Date(),
            notes: "For blood pressure control",
          },
          {
            _id: new mongoose.Types.ObjectId(),
            medicationName: "Atorvastatin 20mg",
            dosage: "20mg",
            frequency: "Once daily at bedtime",
            duration: "30 days",
            instructions: "Take at bedtime",
            status: PrescriptionStatus.ISSUED,
            prescribingPractitionerId: pharmacist._id,
            issuedAt: new Date(),
            notes: "For cholesterol management",
          },
        ],
      },
    ];

    // Insert encounters
    const encounters = await Encounter.insertMany(sampleEncounters);
    console.log(`Created ${encounters.length} sample encounters`);

    // Count total prescriptions created
    const totalPrescriptions = encounters.reduce((total, encounter) => {
      return total + (encounter.prescriptions?.length || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      message: "Sample prescription data created successfully",
      data: {
        patientsCreated: patients.length,
        encountersCreated: encounters.length,
        prescriptionsCreated: totalPrescriptions,
        pharmacistId: pharmacist._id,
      },
    });
  } catch (error) {
    console.error("Error creating sample data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
