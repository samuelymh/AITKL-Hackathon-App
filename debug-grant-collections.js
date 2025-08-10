// Debug Grant Collections and Structure
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function debugGrantCollections() {
  console.log("🔍 Debugging Grant Collections and Structure...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("healthapp");

    // List all collections
    console.log("📋 Available Collections:");
    const collections = await db.listCollections().toArray();
    collections.forEach((col) => {
      console.log(`  - ${col.name}`);
    });
    console.log();

    // Look for grant-related collections
    const grantCollections = collections.filter(
      (col) => col.name.toLowerCase().includes("grant") || col.name.toLowerCase().includes("authorization")
    );

    if (grantCollections.length > 0) {
      console.log("🔍 Grant-related collections found:");
      grantCollections.forEach((col) => {
        console.log(`  ✅ ${col.name}`);
      });
      console.log();

      // Check each grant collection
      for (const col of grantCollections) {
        console.log(`📊 Collection: ${col.name}`);
        const count = await db.collection(col.name).countDocuments();
        console.log(`  Total documents: ${count}`);

        if (count > 0) {
          // Get sample documents
          const samples = await db.collection(col.name).find({}).limit(3).toArray();
          console.log("  Sample documents:");
          samples.forEach((doc, index) => {
            console.log(`    ${index + 1}. ID: ${doc._id}`);
            console.log(`       Status: ${doc.grantDetails?.status || doc.status || "N/A"}`);
            console.log(`       User: ${doc.userId || doc.patientId || "N/A"}`);
            console.log(`       Organization: ${doc.organizationId || "N/A"}`);
            if (doc.accessScope) {
              console.log(
                `       Permissions: ${Object.keys(doc.accessScope)
                  .filter((k) => doc.accessScope[k])
                  .join(", ")}`
              );
            }
            console.log();
          });
        }
        console.log();
      }
    } else {
      console.log("❌ No grant-related collections found!");
    }

    // Let's also check for any collection that might contain grants
    console.log("🔍 Searching for specific grant ID in all collections...");
    const grantId = "689744bf68ab1873acce0cd9";

    for (const col of collections) {
      try {
        // Try to find the grant ID as ObjectId
        let found = await db.collection(col.name).findOne({
          _id: new ObjectId(grantId),
        });

        if (!found) {
          // Try as string
          found = await db.collection(col.name).findOne({
            _id: grantId,
          });
        }

        if (found) {
          console.log(`✅ Found grant in collection: ${col.name}`);
          console.log("   Document:", JSON.stringify(found, null, 2));
          break;
        }
      } catch (e) {
        // Ignore errors for collections that don't support ObjectId queries
      }
    }

    // Also search for the patient ID specifically
    console.log("\n🔍 Searching for patient-related grants...");
    const patientId = "68968272ee09d779cbab284a";

    for (const col of collections) {
      try {
        const grants = await db
          .collection(col.name)
          .find({
            $or: [
              { userId: new ObjectId(patientId) },
              { userId: patientId },
              { patientId: new ObjectId(patientId) },
              { patientId: patientId },
            ],
          })
          .toArray();

        if (grants.length > 0) {
          console.log(`✅ Found ${grants.length} patient grants in collection: ${col.name}`);
          grants.forEach((grant) => {
            console.log(`   - ID: ${grant._id}`);
            console.log(`     Status: ${grant.grantDetails?.status || grant.status || "N/A"}`);
            console.log(`     Expires: ${grant.grantDetails?.expiresAt || grant.expiresAt || "N/A"}`);
          });
        }
      } catch (e) {
        // Ignore errors
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

debugGrantCollections().catch(console.error);
