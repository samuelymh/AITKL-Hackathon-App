// Fix Authorization Grant - Add canCreateEncounters permission (Comprehensive)
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

    // Data from your logs
    const patientDigitalId = "HID_6c46e5e6-2373-4785-815f-373c7c474d36";
    const grantId = "689744bf68ab1873acce0cd9";

    console.log("📋 Target Information:");
    console.log(`  Patient Digital ID: ${patientDigitalId}`);
    console.log(`  Grant ID: ${grantId}\n`);

    // First, find the patient
    const patient = await db.collection("users").findOne({
      digitalIdentifier: patientDigitalId,
    });

    if (!patient) {
      console.log("❌ Patient not found!");
      return;
    }

    console.log("✅ Patient found:", patient._id.toString());

    // Try different ways to find the grant
    console.log("\n🔍 Searching for grant...");

    // Method 1: Try with ObjectId
    let grant = await db.collection("authorizationgrants").findOne({
      _id: new ObjectId(grantId),
    });

    if (!grant) {
      console.log("  Method 1 (ObjectId): Not found");

      // Method 2: Try as string
      grant = await db.collection("authorizationgrants").findOne({
        _id: grantId,
      });
    }

    if (!grant) {
      console.log("  Method 2 (String): Not found");

      // Method 3: Find any active grant for this patient
      console.log("  Method 3: Looking for any active grant for patient...");

      const grants = await db
        .collection("authorizationgrants")
        .find({
          userId: patient._id,
        })
        .toArray();

      console.log(`  Found ${grants.length} total grants for patient:`);

      grants.forEach((g, index) => {
        console.log(`    ${index + 1}. ID: ${g._id.toString()}`);
        console.log(`       Status: ${g.grantDetails?.status}`);
        console.log(`       Expires: ${g.grantDetails?.expiresAt}`);
        console.log(
          `       Permissions: ${Object.keys(g.accessScope || {})
            .filter((k) => g.accessScope[k])
            .join(", ")}`
        );
        console.log();
      });

      // Find the active one that matches our criteria
      grant = grants.find(
        (g) => g.grantDetails?.status === "ACTIVE" && new Date(g.grantDetails?.expiresAt) > new Date()
      );

      if (grant) {
        console.log(`✅ Found active grant: ${grant._id.toString()}`);
      }
    } else {
      console.log("✅ Grant found directly");
    }

    if (!grant) {
      console.log("❌ No active grant found for patient!");
      return;
    }

    console.log("\n📋 Current Grant Details:");
    console.log(`  ID: ${grant._id.toString()}`);
    console.log(`  Status: ${grant.grantDetails?.status}`);
    console.log(`  Expires: ${grant.grantDetails?.expiresAt}`);
    console.log(`  Current permissions:`, grant.accessScope);

    // Check if canCreateEncounters is already present
    if (grant.accessScope?.canCreateEncounters) {
      console.log("\n✅ canCreateEncounters permission already exists!");
      return;
    }

    // Update the grant to include canCreateEncounters
    console.log("\n🔧 Adding canCreateEncounters permission...");

    const updateResult = await db.collection("authorizationgrants").updateOne(
      { _id: grant._id },
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
        _id: grant._id,
      });

      console.log("\n📋 Updated grant permissions:");
      Object.keys(updatedGrant.accessScope || {}).forEach((permission) => {
        if (updatedGrant.accessScope[permission]) {
          console.log(`  ✅ ${permission}: ${updatedGrant.accessScope[permission]}`);
        }
      });

      console.log("\n🎉 SUCCESS! The grant now includes canCreateEncounters permission!");
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
