// Fix Authorization Grant - Add canCreateEncounters permission (FINAL)
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function fixAuthorizationGrant() {
  console.log("🔧 Fixing Authorization Grant to enable canCreateEncounters...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("healthapp");

    // The grant ID and collection name
    const grantId = "689744bf68ab1873acce0cd9";
    const collectionName = "authorization_grants"; // Found it's in this collection

    console.log(`🔍 Looking for grant: ${grantId} in collection: ${collectionName}`);

    // Find the current grant
    const currentGrant = await db.collection(collectionName).findOne({
      _id: grantId, // It's stored as string, not ObjectId
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

    // Check if canCreateEncounters is already enabled
    if (currentGrant.accessScope?.canCreateEncounters === true) {
      console.log("✅ canCreateEncounters permission already enabled!");
      return;
    }

    // Update the grant to enable canCreateEncounters
    console.log("🔧 Enabling canCreateEncounters permission...");

    const updateResult = await db.collection(collectionName).updateOne(
      { _id: grantId },
      {
        $set: {
          "accessScope.canCreateEncounters": true,
          auditModifiedBy: "system-fix",
          auditModifiedDateTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ Grant updated successfully!");

      // Verify the update
      const updatedGrant = await db.collection(collectionName).findOne({
        _id: grantId,
      });

      console.log("\n📋 Updated grant permissions:");
      console.log("  canViewMedicalHistory:", updatedGrant.accessScope?.canViewMedicalHistory);
      console.log("  canViewPrescriptions:", updatedGrant.accessScope?.canViewPrescriptions);
      console.log("  canCreateEncounters:", updatedGrant.accessScope?.canCreateEncounters);
      console.log("  canViewAuditLogs:", updatedGrant.accessScope?.canViewAuditLogs);

      console.log("\n🎉 SUCCESS! The grant now includes canCreateEncounters permission!");
      console.log("   ✅ You should now be able to create encounters.");
      console.log("   ✅ The grant is ACTIVE and expires at:", updatedGrant.grantDetails?.expiresAt);
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
