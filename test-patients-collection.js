const { MongoClient } = require("mongodb");

async function checkPatientsCollection() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log("=== Checking Patients Collection ===");

  // Check patients collection
  const patientsCount = await db.collection("patients").countDocuments();
  console.log("Patients in patients collection:", patientsCount);

  if (patientsCount > 0) {
    // Get a sample patient
    const samplePatient = await db.collection("patients").findOne();
    console.log("Sample patient structure:");
    console.log(JSON.stringify(samplePatient, null, 2));

    // Check if there are encounters for this patient
    const patientEncounters = await db
      .collection("encounters")
      .find({
        $or: [
          { patientId: samplePatient._id },
          { "patient.userId": samplePatient._id },
          { digitalIdentifier: samplePatient.digitalIdentifier },
        ],
      })
      .limit(3)
      .toArray();

    console.log("\nSample encounters for this patient:");
    console.log("Found encounters:", patientEncounters.length);
    if (patientEncounters.length > 0) {
      console.log("Sample encounter structure:");
      console.log(JSON.stringify(patientEncounters[0], null, 2));
    }
  }

  await client.close();
}

checkPatientsCollection().catch(console.error);
