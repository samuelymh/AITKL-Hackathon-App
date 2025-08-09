// Simple Grant Permission Fix with ObjectId
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

    // Try finding grants with ObjectId
    const patientId = new ObjectId("68968272ee09d779cbab284a");
    console.log(`🔍 Looking for grants for patient ObjectId: ${patientId}`);

    const grants = await collection
      .find({
        userId: patientId,
      })
      .toArray();

    console.log(`Found ${grants.length} grants for patient`);

    if (grants.length === 0) {
      console.log("No grants found. Let me check the structure...");

      // Get any grant to see structure
      const anyGrant = await collection.findOne({});
      if (anyGrant) {
        console.log("Sample grant structure:");
        console.log("  _id type:", typeof anyGrant._id);
        console.log("  userId type:", typeof anyGrant.userId);
        console.log("  userId value:", anyGrant.userId);
      }
      return;
    }

    // Find the specific grant we need
    const targetGrantId = "689744bf68ab1873acce0cd9";
    const targetGrant = grants.find(
      (g) =>
        g._id === targetGrantId ||
        g._id.toString() === targetGrantId ||
        (g._id instanceof ObjectId && g._id.toString() === targetGrantId)
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
    console.log("Current permissions:", targetGrant.accessScope);

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
      console.log("✅ Updated permissions:", updated.accessScope);
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
