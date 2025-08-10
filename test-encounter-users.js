const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function checkEncounterUsers() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Get unique userIds from encounters
    const encounters = await db.collection("encounters").find({}).toArray();
    const userIds = [...new Set(encounters.map((e) => e.userId.toString()))];

    console.log("=== User IDs from Encounters ===");
    console.log("Unique user IDs:", userIds);

    // Check if these users exist
    for (const userId of userIds) {
      // Try with ObjectId
      const user = await db.collection("users").findOne({
        _id: new ObjectId(userId),
      });

      console.log(`\nUser ${userId}:`);
      if (user) {
        console.log("- Found in users collection");
        console.log("- Role:", user.role);
        console.log("- Name:", user.personalInfo?.firstName, user.personalInfo?.lastName);
      } else {
        console.log("- NOT FOUND in users collection");
      }
    }

    // Also check authorization grants
    const grants = await db.collection("authorization_grants").find({}).limit(3).toArray();
    const patientIds = [...new Set(grants.map((g) => g.patientId))];

    console.log("\n=== Patient IDs from Authorization Grants ===");
    console.log("Unique patient IDs:", patientIds);

    for (const patientId of patientIds) {
      const user = await db.collection("users").findOne({
        _id: patientId,
      });

      console.log(`\nPatient ${patientId}:`);
      if (user) {
        console.log("- Found in users collection");
        console.log("- Role:", user.role);
        console.log("- Name:", user.personalInfo?.firstName, user.personalInfo?.lastName);
      } else {
        console.log("- NOT FOUND in users collection");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkEncounterUsers();
