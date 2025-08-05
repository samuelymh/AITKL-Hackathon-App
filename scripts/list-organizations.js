#!/usr/bin/env node

/**
 * List Organizations Script
 * Lists all organizations in the database with their verification status
 *
 * Usage: node scripts/list-organizations.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function listOrganizations() {
  let client;

  try {
    console.log("\n🏥 Organizations List\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const orgsCollection = db.collection("organizations");

    // Get all organizations (excluding deleted ones)
    const allOrgs = await orgsCollection
      .find({
        auditDeletedDateTime: { $exists: false },
      })
      .toArray();

    if (allOrgs.length === 0) {
      console.log("📭 No organizations found in the database");
      return;
    }

    console.log(`📊 Found ${allOrgs.length} organization(s):\n`);

    // Group by verification status
    const pending = allOrgs.filter((org) => org.verification?.isVerified === false);
    const verified = allOrgs.filter((org) => org.verification?.isVerified === true);
    const unknown = allOrgs.filter(
      (org) => org.verification?.isVerified === undefined || org.verification?.isVerified === null
    );

    console.log(`🟡 PENDING VERIFICATION (${pending.length}):`);
    if (pending.length === 0) {
      console.log("   No pending organizations\n");
    } else {
      pending.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.organizationInfo?.name || "Unnamed"}`);
        console.log(`      - ID: ${org._id}`);
        console.log(`      - Type: ${org.organizationInfo?.type || "N/A"}`);
        console.log(`      - Email: ${org.contact?.email || "N/A"}`);
        console.log(`      - City: ${org.address?.city || "N/A"}, ${org.address?.state || "N/A"}`);
        console.log(`      - Verified: ${org.verification?.isVerified}`);
        console.log(
          `      - Created: ${org.auditCreatedDateTime ? new Date(org.auditCreatedDateTime).toISOString() : "N/A"}`
        );
        console.log("");
      });
    }

    console.log(`🟢 VERIFIED (${verified.length}):`);
    if (verified.length === 0) {
      console.log("   No verified organizations\n");
    } else {
      verified.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.organizationInfo?.name || "Unnamed"}`);
        console.log(`      - ID: ${org._id}`);
        console.log(`      - Type: ${org.organizationInfo?.type || "N/A"}`);
        console.log(
          `      - Verified At: ${org.verification?.verifiedAt ? new Date(org.verification.verifiedAt).toISOString() : "N/A"}`
        );
        console.log(`      - Verified By: ${org.verification?.verifiedBy || "N/A"}`);
        console.log("");
      });
    }

    if (unknown.length > 0) {
      console.log(`⚪ UNKNOWN STATUS (${unknown.length}):`);
      unknown.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.organizationInfo?.name || "Unnamed"}`);
        console.log(`      - ID: ${org._id}`);
        console.log(`      - Verification Object: ${JSON.stringify(org.verification, null, 6)}`);
        console.log("");
      });
    }

    // Summary
    console.log("📈 SUMMARY:");
    console.log(`   Total: ${allOrgs.length}`);
    console.log(`   Pending: ${pending.length}`);
    console.log(`   Verified: ${verified.length}`);
    console.log(`   Unknown: ${unknown.length}`);
    console.log("");

    // Sample query results that the API would use
    console.log("🔍 API QUERY SIMULATION:");

    const pendingQuery = {
      "verification.isVerified": false,
      auditDeletedDateTime: { $exists: false },
    };

    const pendingCount = await orgsCollection.countDocuments(pendingQuery);
    console.log(`   Pending query count: ${pendingCount}`);

    const pendingDocs = await orgsCollection.find(pendingQuery).limit(5).toArray();
    console.log(`   Pending query results: ${pendingDocs.length} documents returned`);

    if (pendingDocs.length > 0) {
      console.log(`   First pending org: ${pendingDocs[0].organizationInfo?.name}`);
      console.log(`   First pending verification: ${JSON.stringify(pendingDocs[0].verification, null, 6)}`);
    }
  } catch (error) {
    console.error("❌ Error listing organizations:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 List operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  listOrganizations().catch(console.error);
}

module.exports = { listOrganizations };
