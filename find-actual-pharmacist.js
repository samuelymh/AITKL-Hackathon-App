const { MongoClient } = require("mongodb");

// Load environment variables
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, ".env.local");
    const envContent = fs.readFileSync(envPath, "utf8");

    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error("Error loading .env.local file:", error.message);
  }
}

loadEnvFile();

async function findActualPharmacist() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();

    const db = client.db("healthapp");

    // Find users with pharmacist role
    const pharmacistUsers = await db
      .collection("users")
      .find({
        "auth.role": "pharmacist",
      })
      .toArray();

    console.log(`📋 Found ${pharmacistUsers.length} users with pharmacist role`);

    for (const user of pharmacistUsers) {
      console.log(`\n👤 Pharmacist User:`);
      console.log(`- User ID: ${user._id}`);
      console.log(`- Digital ID: ${user.digitalIdentifier}`);
      console.log(`- Role: ${user.auth.role}`);

      // Find their practitioner record
      const practitioner = await db.collection("practitioners").findOne({
        userId: user._id,
      });

      if (practitioner) {
        console.log(`- Practitioner ID: ${practitioner._id}`);

        // Find their organization membership
        const membership = await db.collection("organizationMembers").findOne({
          practitionerId: practitioner._id,
          status: "active",
        });

        if (membership) {
          console.log(`- Organization ID: ${membership.organizationId}`);
          console.log(`- Membership Status: ${membership.status}`);
          console.log(`- Role in Org: ${membership.membershipDetails.role}`);

          // Now check if there's a grant for our test patient in this organization
          const grant = await db.collection("authorization_grants").findOne({
            userId: new db.admin().constructor.ObjectId("68968272ee09d779cbab284a"), // Our test patient
            organizationId: membership.organizationId,
            "grantDetails.status": "ACTIVE",
          });

          if (grant) {
            console.log(`✅ Found matching grant for this pharmacist's organization!`);
            console.log(`- Grant ID: ${grant._id}`);
            console.log(`- Expires: ${grant.grantDetails.expiresAt}`);

            console.log(`\n🔗 API Test Command:`);
            console.log(
              `curl -X GET "http://localhost:3000/api/pharmacist/patient/HID_6c46e5e6-2373-4785-815f-373c7c474d36/medications" \\`
            );
            console.log(`  -H "Authorization: Bearer PHARMACIST_TOKEN_FOR_USER_${user._id}"`);

            return { userId: user._id, organizationId: membership.organizationId, grant };
          } else {
            console.log(`❌ No grant found for this pharmacist's organization`);
          }
        } else {
          console.log(`❌ No active organization membership found`);
        }
      } else {
        console.log(`❌ No practitioner record found`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n🔐 MongoDB connection closed");
  }
}

findActualPharmacist().catch(console.error);
