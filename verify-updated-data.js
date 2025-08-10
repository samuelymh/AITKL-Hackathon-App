const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function verifyUpdatedData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("=== VERIFICATION OF UPDATED DATA ===");

    // Check role distribution
    const roleDistribution = await db
      .collection("users")
      .aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    console.log("\n📊 Role Distribution:");
    roleDistribution.forEach((role) => {
      console.log(`  ${role._id || "No Role"}: ${role.count} users`);
    });

    // Check patients with encounters
    const patientsWithEncounters = await db
      .collection("users")
      .aggregate([
        {
          $match: { role: "patient" },
        },
        {
          $lookup: {
            from: "encounters",
            localField: "_id",
            foreignField: "userId",
            as: "encounters",
          },
        },
        {
          $project: {
            _id: 1,
            personalInfo: 1,
            encounterCount: { $size: "$encounters" },
            medicalInfo: 1,
          },
        },
      ])
      .toArray();

    console.log("\n👥 Patients with Medical Data:");
    patientsWithEncounters.forEach((patient, index) => {
      const firstName =
        typeof patient.personalInfo?.firstName === "string" ? patient.personalInfo.firstName : "Encrypted";
      const lastName = typeof patient.personalInfo?.lastName === "string" ? patient.personalInfo.lastName : "Encrypted";

      console.log(`  ${index + 1}. ${firstName} ${lastName}`);
      console.log(`     - Encounters: ${patient.encounterCount}`);
      console.log(`     - Blood Type: ${patient.medicalInfo?.bloodType || "Not set"}`);
      console.log(`     - Allergies: ${patient.medicalInfo?.knownAllergies?.length || 0}`);
      console.log(`     - Smoking Status: ${patient.medicalInfo?.smokingStatus || "Not set"}`);
    });

    // Check total encounters created
    const totalEncounters = await db.collection("encounters").countDocuments();
    console.log(`\n🏥 Total Encounters: ${totalEncounters}`);

    // Check authorization grants
    const totalGrants = await db.collection("authorization_grants").countDocuments();
    console.log(`🔐 Total Authorization Grants: ${totalGrants}`);

    // Sample a rich patient for testing
    const richPatient = await db.collection("users").findOne({
      role: "patient",
      "medicalInfo.bloodType": { $exists: true },
    });

    if (richPatient) {
      console.log("\n🎯 SAMPLE PATIENT FOR CLINICAL ASSISTANT TESTING:");
      console.log(`  Patient ID: ${richPatient._id}`);
      console.log(`  Digital ID: ${richPatient.digitalIdentifier}`);
      console.log(`  Role: ${richPatient.role}`);
      console.log(`  Type: ${richPatient.type}`);

      const encounters = await db
        .collection("encounters")
        .find({
          userId: richPatient._id,
        })
        .toArray();

      console.log(`  Encounters: ${encounters.length}`);

      if (encounters.length > 0) {
        const sampleEncounter = encounters[0];
        console.log(`  Sample Chief Complaint: ${sampleEncounter.encounter?.chiefComplaint}`);
        console.log(`  Sample Diagnosis: ${sampleEncounter.diagnoses?.[0]?.description}`);
        console.log(`  Sample Medication: ${sampleEncounter.prescriptions?.[0]?.medicationName}`);
      }

      console.log("\n🚀 RECOMMENDED TEST:");
      console.log(`  1. Go to: /doctor/medical-history/${richPatient.digitalIdentifier}`);
      console.log(`  2. Open the Clinical AI Assistant (brain icon)`);
      console.log(`  3. Ask: "What are this patient's key risk factors and clinical considerations?"`);
      console.log(`  4. Expected: Patient-specific insights based on actual medical data`);
    }

    console.log("\n✅ Data verification complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

verifyUpdatedData();
