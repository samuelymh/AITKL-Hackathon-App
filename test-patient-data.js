const { MongoClient } = require("mongodb");

async function checkPatientData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log("=== Checking Patient Data ===");

  // Check users collection
  const usersCount = await db.collection("users").countDocuments();
  const patientsCount = await db.collection("users").countDocuments({ role: "patient" });
  console.log("Total users:", usersCount);
  console.log("Patients:", patientsCount);

  // Check encounters collection
  const encountersCount = await db.collection("encounters").countDocuments();
  console.log("Encounters:", encountersCount);

  // Find a sample patient
  const samplePatient = await db.collection("users").findOne({ role: "patient" });
  if (samplePatient) {
    console.log("Sample patient ID:", samplePatient._id);
    console.log("Sample patient email:", samplePatient.email);
    console.log("Sample patient digital ID:", samplePatient.digitalIdentifier);

    // Check if this patient has encounters
    const patientEncounters = await db.collection("encounters").countDocuments({
      $or: [{ patientId: samplePatient._id }, { "patient.userId": samplePatient._id }],
    });
    console.log("Sample patient encounters:", patientEncounters);
  } else {
    console.log("❌ No patients found in database");
  }

  // Check collections list
  const collections = await db.listCollections().toArray();
  console.log(
    "\nAll collections:",
    collections.map((c) => c.name)
  );

  await client.close();
}

checkPatientData().catch(console.error);
