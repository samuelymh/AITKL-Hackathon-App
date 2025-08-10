const { MongoClient } = require("mongodb");

async function checkEncounters() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log("=== Checking Encounters Collection ===");

  // Get sample encounters
  const encounters = await db.collection("encounters").find().limit(2).toArray();
  console.log("Found encounters:", encounters.length);

  if (encounters.length > 0) {
    console.log("Sample encounter structure:");
    console.log(JSON.stringify(encounters[0], null, 2));

    // Check if encounters have patient data
    const encountersWithPatients = await db.collection("encounters").countDocuments({
      $or: [{ patientId: { $exists: true } }, { patient: { $exists: true } }, { digitalIdentifier: { $exists: true } }],
    });

    console.log("Encounters with patient data:", encountersWithPatients);
  }

  // Check authorization grants to see patient data structure
  console.log("\n=== Checking Authorization Grants ===");
  const grants = await db.collection("authorizationGrants").find().limit(1).toArray();
  if (grants.length > 0) {
    console.log("Sample grant structure:");
    console.log(JSON.stringify(grants[0], null, 2));
  }

  await client.close();
}

checkEncounters().catch(console.error);
