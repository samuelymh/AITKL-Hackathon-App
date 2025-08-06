#!/usr/bin/env node

/**
 * Script to debug prescription data in the database
 */

const { default: connectToDatabase } = require("../lib/mongodb.ts");
const { default: Encounter } = require("../lib/models/Encounter.ts");

async function debugPrescriptionData() {
  console.log("🔍 Debugging Prescription Data");
  console.log("==============================\n");

  try {
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Check all encounters with prescriptions
    console.log("📋 All encounters with prescriptions:");
    const allEncounters = await Encounter.find({ prescriptions: { $exists: true, $ne: [] } })
      .populate("userId", "personalInfo digitalIdentifier")
      .populate("attendingPractitionerId", "professionalInfo")
      .limit(10);

    console.log(`Found ${allEncounters.length} encounters with prescriptions\n`);

    for (const encounter of allEncounters) {
      console.log(`Encounter ID: ${encounter._id}`);
      console.log(`Patient: ${encounter.userId?.personalInfo?.firstName} ${encounter.userId?.personalInfo?.lastName}`);
      console.log(`Patient ID: ${encounter.userId?.digitalIdentifier}`);
      console.log(`Prescriptions (${encounter.prescriptions.length}):`);

      for (const prescription of encounter.prescriptions) {
        console.log(`  - ${prescription.medicationName} ${prescription.dosage}`);
        console.log(`    Status: ${prescription.status}`);
        console.log(`    Issued: ${new Date(prescription.issuedAt).toLocaleString()}`);
        console.log(`    ID: ${prescription._id}`);
      }
      console.log("---");
    }

    // Check specifically for ISSUED prescriptions
    console.log("\n📊 Prescription status summary:");
    const statusSummary = await Encounter.aggregate([
      { $match: { prescriptions: { $exists: true, $ne: [] } } },
      { $unwind: "$prescriptions" },
      { $group: { _id: "$prescriptions.status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    for (const status of statusSummary) {
      console.log(`  ${status._id}: ${status.count}`);
    }

    // Check for ISSUED prescriptions specifically
    console.log("\n💊 ISSUED prescriptions:");
    const issuedPrescriptions = await Encounter.aggregate([
      { $match: { "prescriptions.status": "ISSUED" } },
      { $unwind: "$prescriptions" },
      { $match: { "prescriptions.status": "ISSUED" } },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "patient" } },
      { $unwind: "$patient" },
      {
        $project: {
          prescriptionId: "$prescriptions._id",
          medicationName: "$prescriptions.medicationName",
          dosage: "$prescriptions.dosage",
          status: "$prescriptions.status",
          patientName: { $concat: ["$patient.personalInfo.firstName", " ", "$patient.personalInfo.lastName"] },
          patientId: "$patient.digitalIdentifier",
          issuedAt: "$prescriptions.issuedAt",
        },
      },
    ]);

    console.log(`Found ${issuedPrescriptions.length} ISSUED prescriptions:`);
    for (const prescription of issuedPrescriptions) {
      console.log(`  - ${prescription.medicationName} for ${prescription.patientName}`);
      console.log(`    Status: ${prescription.status}, ID: ${prescription.prescriptionId}`);
    }
  } catch (error) {
    console.error("❌ Failed to debug prescription data:", error);
  } finally {
    process.exit(0);
  }
}

debugPrescriptionData();
