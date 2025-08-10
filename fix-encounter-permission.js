// Fix Authorization Grant - Add canCreateEncounters permission
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function fixAuthorizationGrant() {
  console.log("🔧 Fixing Authorization Grant to include canCreateEncounters...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("healthapp");

    // The grant ID from your logs
    const grantId = "689744bf68ab1873acce0cd9";

    console.log(`🔍 Looking for grant: ${grantId}`);

    // Find the current grant
    const currentGrant = await db.collection("authorizationgrants").findOne({
      _id: new ObjectId(grantId),
    });

    if (!currentGrant) {
      console.log("❌ Grant not found!");
      return;
    }

    console.log("✅ Current grant found:");
    console.log("  Status:", currentGrant.grantDetails?.status);
    console.log("  Expires:", currentGrant.grantDetails?.expiresAt);
    console.log("  Current permissions:", currentGrant.accessScope);
    console.log();

    // Check if canCreateEncounters is already present
    if (currentGrant.accessScope?.canCreateEncounters) {
      console.log("✅ canCreateEncounters permission already exists!");
      return;
    }

    // Update the grant to include canCreateEncounters
    console.log("🔧 Adding canCreateEncounters permission...");

    const updateResult = await db.collection("authorizationgrants").updateOne(
      { _id: new ObjectId(grantId) },
      {
        $set: {
          "accessScope.canCreateEncounters": true,
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ Grant updated successfully!");

      // Verify the update
      const updatedGrant = await db.collection("authorizationgrants").findOne({
        _id: new ObjectId(grantId),
      });

      console.log("\n📋 Updated grant permissions:");
      console.log("  canViewMedicalHistory:", updatedGrant.accessScope?.canViewMedicalHistory);
      console.log("  canViewPrescriptions:", updatedGrant.accessScope?.canViewPrescriptions);
      console.log("  canCreateEncounters:", updatedGrant.accessScope?.canCreateEncounters);

      console.log("\n🎉 The grant now includes canCreateEncounters permission!");
      console.log("   You should now be able to create encounters.");
    } else {
      console.log("❌ Failed to update grant");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

fixAuthorizationGrant().catch(console.error);
