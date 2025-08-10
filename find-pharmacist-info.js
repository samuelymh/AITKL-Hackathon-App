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

async function findPharmacistInfo() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();

    const db = client.db("healthapp");

    // Find a pharmacist organization member
    const pharmacistMember = await db.collection("organizationMembers").findOne({
      "membershipDetails.role": "pharmacist",
      status: "active",
    });

    if (!pharmacistMember) {
      console.log("❌ No active pharmacist found");
      return;
    }

    console.log("📋 Found pharmacist member:", pharmacistMember._id);
    console.log("👤 Practitioner ID:", pharmacistMember.practitionerId);
    console.log("🏥 Organization ID:", pharmacistMember.organizationId);

    // Find the practitioner record
    const practitioner = await db.collection("practitioners").findOne({
      _id: pharmacistMember.practitionerId,
    });

    if (!practitioner) {
      console.log("❌ Practitioner record not found");
      return;
    }

    console.log("👨‍⚕️ Practitioner User ID:", practitioner.userId);

    // Find the user record
    const user = await db.collection("users").findOne({
      _id: practitioner.userId,
    });

    if (!user) {
      console.log("❌ User record not found");
      return;
    }

    console.log("🆔 User Digital ID:", user.digitalIdentifier);
    console.log("📧 User email (encrypted):", user.personalInfo?.contact?.email);
    console.log("👤 User role:", user.auth?.role);

    // Find the patient we're trying to access
    const patient = await db.collection("users").findOne({
      digitalIdentifier: "HID_6c46e5e6-2373-4785-815f-373c7c474d36",
    });

    if (!patient) {
      console.log("❌ Patient not found");
      return;
    }

    console.log("\n🏥 Patient Info:");
    console.log("- Patient ID:", patient._id);
    console.log("- Digital ID:", patient.digitalIdentifier);

    // Check for authorization grant
    const grant = await db.collection("authorization_grants").findOne({
      userId: patient._id,
      organizationId: pharmacistMember.organizationId,
      "grantDetails.status": "ACTIVE",
    });

    console.log("\n🔐 Authorization Grant:");
    if (grant) {
      console.log("- Grant ID:", grant._id);
      console.log("- Status:", grant.grantDetails.status);
      console.log("- Expires At:", grant.grantDetails.expiresAt);
      console.log("- Can View Prescriptions:", grant.accessScope.canViewPrescriptions);
      console.log("- Can View Medical History:", grant.accessScope.canViewMedicalHistory);
    } else {
      console.log("❌ No active grant found for this patient and organization");
    }

    console.log("\n🔗 API Test Details:");
    console.log(`- Pharmacist User ID: ${practitioner.userId}`);
    console.log(`- Organization ID: ${pharmacistMember.organizationId}`);
    console.log(`- Patient Digital ID: ${patient.digitalIdentifier}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n🔐 MongoDB connection closed");
  }
}

findPharmacistInfo().catch(console.error);
