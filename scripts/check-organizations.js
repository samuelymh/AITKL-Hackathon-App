const mongoose = require("mongoose");
require("dotenv").config();

// Define a simple organization schema for checking
const organizationSchema = new mongoose.Schema({}, { strict: false });
const Organization = mongoose.model("Organization", organizationSchema);

async function checkOrganizations() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    // Basic counts
    console.log("\n=== ORGANIZATION COUNTS ===");
    const total = await Organization.countDocuments();
    console.log(`Total organizations: ${total}`);

    const withoutDeleted = await Organization.countDocuments({ auditDeletedDateTime: { $exists: false } });
    console.log(`Active organizations (not deleted): ${withoutDeleted}`);

    const pending = await Organization.countDocuments({
      "verification.isVerified": false,
      auditDeletedDateTime: { $exists: false },
    });
    console.log(`Pending verification: ${pending}`);

    const verified = await Organization.countDocuments({
      "verification.isVerified": true,
      auditDeletedDateTime: { $exists: false },
    });
    console.log(`Verified: ${verified}`);

    // Get a sample organization
    console.log("\n=== SAMPLE ORGANIZATION ===");
    const sample = await Organization.findOne({ auditDeletedDateTime: { $exists: false } });
    if (sample) {
      console.log("Sample organization structure:");
      console.log("ID:", sample._id);
      console.log("Name:", sample.organizationInfo?.name);
      console.log("Type:", sample.organizationInfo?.type);
      console.log("Verification:", sample.verification);
      console.log("Created:", sample.auditCreatedDateTime);
    } else {
      console.log("No organizations found");
    }

    // List all organizations for verification
    console.log("\n=== ALL ACTIVE ORGANIZATIONS ===");
    const allOrgs = await Organization.find({ auditDeletedDateTime: { $exists: false } })
      .select("organizationInfo.name organizationInfo.type verification auditCreatedDateTime")
      .sort({ auditCreatedDateTime: -1 });

    allOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.organizationInfo?.name} (${org.organizationInfo?.type})`);
      console.log(`   Verified: ${org.verification?.isVerified}`);
      console.log(`   Created: ${org.auditCreatedDateTime}`);
      console.log("");
    });

    // Check specifically for pending organizations that should be returned by the API
    console.log("\n=== PENDING ORGANIZATIONS DETAILED ===");
    const pendingOrgs = await Organization.find({
      "verification.isVerified": false,
      auditDeletedDateTime: { $exists: false },
    }).lean();

    console.log(`Found ${pendingOrgs.length} pending organizations:`);
    pendingOrgs.forEach((org, index) => {
      console.log(`${index + 1}. Name: ${org.organizationInfo?.name}`);
      console.log(`   ID: ${org._id}`);
      console.log(`   Type: ${org.organizationInfo?.type}`);
      console.log(`   isVerified: ${org.verification?.isVerified}`);
      console.log(`   verification object:`, JSON.stringify(org.verification, null, 2));
      console.log("");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
}

checkOrganizations();
