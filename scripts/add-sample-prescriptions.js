#!/usr/bin/env node

/**
 * Script to add sample prescription data for testing the pharmacy dashboard
 */

const { default: connectToDatabase } = require("../lib/mongodb.ts");
const { default: User } = require("../lib/models/User.ts");
const { default: Practitioner } = require("../lib/models/Practitioner.ts");
const { default: Encounter } = require("../lib/models/Encounter.ts");
const { default: Organization } = require("../lib/models/Organization.ts");

async function addSamplePrescriptions() {
  console.log("🧪 Adding Sample Prescription Data");
  console.log("===================================\n");

  try {
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Find a patient
    console.log("📋 Step 1: Finding a test patient...");
    const patient = await User.findOne({ "auth.role": "patient" });
    if (!patient) {
      console.log("❌ No patient found");
      return;
    }
    console.log(`✅ Found patient: ${patient.digitalIdentifier}`);

    // Find a doctor
    console.log("📋 Step 2: Finding a test doctor...");
    const doctorUser = await User.findOne({ "auth.role": "doctor" });
    if (!doctorUser) {
      console.log("❌ No doctor found");
      return;
    }

    const doctor = await Practitioner.findOne({ userId: doctorUser._id });
    if (!doctor) {
      console.log("❌ No practitioner record found for doctor");
      return;
    }
    console.log(`✅ Found doctor: ${doctor._id}`);

    // Find an organization
    console.log("📋 Step 3: Finding an organization...");
    const organization = await Organization.findOne();
    if (!organization) {
      console.log("❌ No organization found");
      return;
    }
    console.log(`✅ Found organization: ${organization.organizationInfo.name}`);

    // Create a sample encounter with prescriptions
    console.log("📋 Step 4: Creating sample encounter with prescriptions...");

    const sampleEncounter = {
      userId: patient._id,
      organizationId: organization._id,
      attendingPractitionerId: doctor._id,
      authorizationGrantId: organization._id, // Using org ID as placeholder
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
    console.log(`✅ Created encounter with ${encounter.prescriptions.length} prescriptions`);

    // List the created prescriptions
    console.log("\n💊 Created prescriptions:");
    encounter.prescriptions.forEach((prescription, index) => {
      console.log(`   ${index + 1}. ${prescription.medicationName} ${prescription.dosage}`);
      console.log(`      Frequency: ${prescription.frequency}`);
      console.log(`      Status: ${prescription.status}`);
      console.log(`      ID: ${prescription._id}`);
      console.log("");
    });

    console.log("✅ Sample prescription data added successfully!");
    console.log("🎯 The pharmacy dashboard should now show pending prescriptions.");
  } catch (error) {
    console.error("❌ Failed to add sample data:", error);
  } finally {
    process.exit(0);
  }
}

addSamplePrescriptions();
