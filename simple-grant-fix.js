// Simple Grant Permission Fix
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function fixGrant() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("healthapp");
    const collection = db.collection("authorization_grants");

    // First, let's find the grant by patient ID since we know that works
    const patientId = "68968272ee09d779cbab284a";
    console.log(`🔍 Looking for grants for patient: ${patientId}`);

    const grants = await collection
      .find({
        userId: patientId,
      })
      .toArray();

    console.log(`Found ${grants.length} grants for patient`);

    // Find the specific grant we need
    const targetGrant = grants.find(
      (g) => g._id === "689744bf68ab1873acce0cd9" || g._id.toString() === "689744bf68ab1873acce0cd9"
    );

    if (!targetGrant) {
      console.log("❌ Target grant not found");
      console.log("Available grants:");
      grants.forEach((g) => {
        console.log(`  - ${g._id} (Status: ${g.grantDetails?.status})`);
      });
      return;
    }

    console.log("✅ Found target grant:", targetGrant._id);
    console.log("Current canCreateEncounters:", targetGrant.accessScope?.canCreateEncounters);

    if (targetGrant.accessScope?.canCreateEncounters === true) {
      console.log("✅ Already has permission");
      return;
    }

    // Update the grant
    console.log("🔧 Updating grant...");
    const result = await collection.updateOne(
      { _id: targetGrant._id },
      {
        $set: {
          "accessScope.canCreateEncounters": true,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Grant updated successfully!");

      // Verify
      const updated = await collection.findOne({ _id: targetGrant._id });
      console.log("✅ Verified canCreateEncounters:", updated.accessScope?.canCreateEncounters);
      console.log("🎉 You can now create encounters!");
    } else {
      console.log("❌ Update failed");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

fixGrant().catch(console.error);
