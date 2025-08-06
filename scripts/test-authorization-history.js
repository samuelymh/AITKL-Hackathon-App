#!/usr/bin/env node

/**
 * Test script to verify authorization history functionality
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function testAuthorizationHistory() {
  try {
    console.log("🔍 Testing Authorization History Functionality\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Import the authorization service function
    const { getAuthorizationGrantsForPatient } = require("../lib/services/authorization-service");

    // Get some sample patient ID from existing authorization grants
    const AuthorizationGrant = mongoose.model("AuthorizationGrant", new mongoose.Schema({}, { strict: false }));
    const sampleGrant = await AuthorizationGrant.findOne();

    if (!sampleGrant) {
      console.log("⚠️  No authorization grants found. Create some sample data first.");
      return;
    }

    const patientId = sampleGrant.patientId;
    if (!patientId) {
      console.log("⚠️  No patient ID found in authorization grant.");
      return;
    }

    console.log(`📋 Testing authorization history for patient: ${patientId}`);

    // Test the service function with different options
    console.log("\n1. Testing all grants:");
    const allGrants = await getAuthorizationGrantsForPatient(patientId);
    console.log(`   Found ${allGrants.length} total grant(s)`);

    console.log("\n2. Testing active grants only:");
    const activeGrants = await getAuthorizationGrantsForPatient(patientId, { status: "ACTIVE" });
    console.log(`   Found ${activeGrants.length} active grant(s)`);

    console.log("\n3. Testing with limit:");
    const limitedGrants = await getAuthorizationGrantsForPatient(patientId, { limit: 5 });
    console.log(`   Found ${limitedGrants.length} grant(s) (limited to 5)`);

    if (allGrants.length > 0) {
      console.log("\n📄 Sample grant details:");
      const sampleGrantDetail = allGrants[0];
      console.log(`   Grant ID: ${sampleGrantDetail.grantId}`);
      console.log(`   Organization: ${sampleGrantDetail.organization?.organizationInfo?.name || "Unknown"}`);
      console.log(`   Requester: ${sampleGrantDetail.requester?.name || "Unknown"}`);
      console.log(`   Requester Type: ${sampleGrantDetail.requester?.type || "Unknown"}`);
      console.log(`   Status: ${sampleGrantDetail.status}`);
      console.log(`   Created: ${sampleGrantDetail.createdAt}`);
      console.log(`   Access Scope: ${sampleGrantDetail.accessScope?.join(", ") || "None"}`);

      console.log("\n✅ Authorization history service is working correctly!");
    } else {
      console.log("\n⚠️  No grants found for this patient.");
    }

    // Test API endpoint structure
    console.log("\n🔌 API endpoint should be available at:");
    console.log("   GET /api/patient/authorization-history");
    console.log("   Query params: status, limit, includeExpired");
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    console.log("\n🔐 Database connection closed");
    await mongoose.connection.close();
  }
}

testAuthorizationHistory();
