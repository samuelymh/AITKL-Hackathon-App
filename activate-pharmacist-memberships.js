const { MongoClient } = require("mongodb");

// Load environment variables directly from .env.local file
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
          const value = valueParts.join("=").replace(/^(["'])|(["'])$/g, "");
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error("Error loading .env.local file:", error.message);
  }
}

loadEnvFile();

async function activatePharmacistMemberships() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();

    const db = client.db("healthapp");
    const organizationMembersCollection = db.collection("organizationMembers");

    // Find all pending pharmacist and doctor memberships
    const pendingMemberships = await organizationMembersCollection
      .find({
        "membershipDetails.role": { $in: ["pharmacist", "doctor"] },
        status: "pending",
      })
      .toArray();

    console.log(`📋 Found ${pendingMemberships.length} pending healthcare professional memberships`);

    if (pendingMemberships.length === 0) {
      console.log("✅ No pending memberships to activate");
      return;
    }

    // Show what we're about to update
    for (const membership of pendingMemberships) {
      console.log(`- ${membership.membershipDetails.role} membership: ${membership._id}`);
    }

    // Update all pending healthcare professional memberships to active
    const result = await organizationMembersCollection.updateMany(
      {
        "membershipDetails.role": { $in: ["pharmacist", "doctor"] },
        status: "pending",
      },
      {
        $set: {
          status: "active",
          "metadata.activationDate": new Date(),
          "metadata.notes": "Automatically activated - healthcare professional registration update",
          "permissions.canAccessPatientRecords": true,
          "permissions.canRequestAuthorizationGrants": true,
          auditModifiedBy: "system-activation-script",
          auditModifiedDateTime: new Date(),
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} memberships to active status`);

    // Update permissions based on role
    const pharmacistResult = await organizationMembersCollection.updateMany(
      {
        "membershipDetails.role": "pharmacist",
        status: "active",
      },
      {
        $set: {
          "permissions.canPrescribeMedications": true,
          auditModifiedBy: "system-activation-script",
          auditModifiedDateTime: new Date(),
        },
      }
    );

    const doctorResult = await organizationMembersCollection.updateMany(
      {
        "membershipDetails.role": "doctor",
        status: "active",
      },
      {
        $set: {
          "permissions.canModifyPatientRecords": true,
          "permissions.canPrescribeMedications": true,
          auditModifiedBy: "system-activation-script",
          auditModifiedDateTime: new Date(),
        },
      }
    );

    console.log(`✅ Updated ${pharmacistResult.modifiedCount} pharmacist permissions`);
    console.log(`✅ Updated ${doctorResult.modifiedCount} doctor permissions`);

    // Verify the updates
    const activeMemberships = await organizationMembersCollection
      .find({
        "membershipDetails.role": { $in: ["pharmacist", "doctor"] },
        status: "active",
      })
      .toArray();

    console.log(`\n📊 Summary:`);
    console.log(`- Total active healthcare professional memberships: ${activeMemberships.length}`);
    console.log(
      `- Active pharmacists: ${activeMemberships.filter((m) => m.membershipDetails.role === "pharmacist").length}`
    );
    console.log(`- Active doctors: ${activeMemberships.filter((m) => m.membershipDetails.role === "doctor").length}`);
  } catch (error) {
    console.error("❌ Error activating pharmacist memberships:", error);
  } finally {
    await client.close();
    console.log("🔐 MongoDB connection closed");
  }
}

// Run the script
activatePharmacistMemberships().catch(console.error);
