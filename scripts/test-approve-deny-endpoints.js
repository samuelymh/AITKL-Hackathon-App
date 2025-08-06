#!/usr/bin/env node

/**
 * Test script to verify the approve/deny API endpoints work correctly
 * Tests the complete workflow from QR scan to authorization grant approval/denial
 */

require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Test configuration
const TEST_CONFIG = {
  baseUrl: "http://localhost:3000",
  timeout: 10000,
};

async function generateTestJWT(userId, digitalIdentifier, role = "patient") {
  const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

  const payload = {
    userId,
    digitalIdentifier,
    role,
    iss: process.env.JWT_ISSUER || "health-app",
    aud: process.env.JWT_AUDIENCE || "health-app-users",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function makeAuthenticatedRequest(url, options = {}, token) {
  const fetch = (await import("node-fetch")).default;

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    timeout: TEST_CONFIG.timeout,
  });

  const data = await response.json();
  return { response, data };
}

async function testApproveDenyEndpoints() {
  try {
    console.log("🔍 Testing Approve/Deny API Endpoints\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Get or create test data
    const AuthorizationGrant = mongoose.model("AuthorizationGrant", new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const NotificationJob = mongoose.model("NotificationJob", new mongoose.Schema({}, { strict: false }));

    // Find a test patient user
    let testPatient = await User.findOne({ "auth.role": "patient" });
    if (!testPatient) {
      console.log("⚠️  No patient users found. Creating a test patient...");
      // You might want to create a test patient here or use a known patient ID
      throw new Error("No patient users available for testing. Please create a patient user first.");
    }

    console.log(`📋 Using test patient: ${testPatient.digitalIdentifier || testPatient._id}`);

    // Create a test authorization grant if none exists
    let testGrant = await AuthorizationGrant.findOne({
      userId: testPatient._id,
      "grantDetails.status": "PENDING",
    });

    if (!testGrant) {
      console.log("📝 Creating test authorization grant...");

      // Find an organization for the test
      const Organization = mongoose.model("Organization", new mongoose.Schema({}, { strict: false }));
      const testOrg = await Organization.findOne();

      if (!testOrg) {
        throw new Error("No organizations found. Please create an organization first.");
      }

      // Create test grant
      testGrant = await AuthorizationGrant.create({
        userId: testPatient._id,
        organizationId: testOrg._id,
        grantDetails: {
          status: "PENDING",
          timeWindowHours: 24,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        accessScope: {
          canViewMedicalHistory: true,
          canViewPrescriptions: true,
          canCreateEncounters: false,
          canViewAuditLogs: false,
        },
        requestMetadata: {
          ipAddress: "127.0.0.1",
          userAgent: "Test-Script/1.0",
        },
      });

      console.log(`✅ Created test grant: ${testGrant._id}`);
    } else {
      console.log(`📋 Using existing test grant: ${testGrant._id}`);
    }

    // Generate JWT token for the test patient
    const patientToken = await generateTestJWT(
      testPatient._id.toString(),
      testPatient.digitalIdentifier || testPatient._id.toString(),
      "patient"
    );

    console.log("🔑 Generated test JWT token");

    // Test 1: Approve Authorization Grant
    console.log("\n📝 Testing APPROVE endpoint...");

    const approvePayload = {
      grantId: testGrant._id.toString(),
      reason: "Testing approve functionality",
    };

    try {
      const { response: approveResponse, data: approveData } = await makeAuthenticatedRequest(
        `${TEST_CONFIG.baseUrl}/api/v1/authorizations/approve`,
        {
          method: "PATCH",
          body: JSON.stringify(approvePayload),
        },
        patientToken
      );

      if (approveResponse.ok) {
        console.log("✅ Approve endpoint responded successfully");
        console.log(`   Status: ${approveData.data?.newStatus}`);
        console.log(`   Grant ID: ${approveData.data?.grantId}`);
        console.log(`   Granted At: ${approveData.data?.grantedAt}`);
        console.log(`   Expires At: ${approveData.data?.expiresAt}`);

        // Verify the grant was actually updated in the database
        const updatedGrant = await AuthorizationGrant.findById(testGrant._id);
        console.log(`   Database Status: ${updatedGrant.grantDetails?.status}`);

        if (updatedGrant.grantDetails?.status === "ACTIVE") {
          console.log("✅ Grant status correctly updated to ACTIVE");
        } else {
          console.log(`❌ Expected ACTIVE, got ${updatedGrant.grantDetails?.status}`);
        }

        // Check if related notifications were updated
        const relatedNotifications = await NotificationJob.find({
          "payload.data.grantId": testGrant._id.toString(),
        });

        console.log(`   Found ${relatedNotifications.length} related notification(s)`);
        relatedNotifications.forEach((notif, index) => {
          console.log(`     ${index + 1}. Notification status: ${notif.status}`);
        });
      } else {
        console.log(`❌ Approve endpoint failed: ${approveResponse.status}`);
        console.log(`   Error: ${approveData.error}`);
        console.log(`   Details: ${approveData.details || "No details"}`);
      }
    } catch (error) {
      console.log(`❌ Approve endpoint request failed: ${error.message}`);
    }

    // Test 2: Create another grant for deny test
    console.log("\n📝 Creating second grant for DENY test...");

    const testGrant2 = await AuthorizationGrant.create({
      userId: testPatient._id,
      organizationId: testGrant.organizationId,
      grantDetails: {
        status: "PENDING",
        timeWindowHours: 12,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
      accessScope: {
        canViewMedicalHistory: false,
        canViewPrescriptions: true,
        canCreateEncounters: false,
        canViewAuditLogs: false,
      },
      requestMetadata: {
        ipAddress: "127.0.0.1",
        userAgent: "Test-Script/1.0",
      },
    });

    console.log(`✅ Created second test grant: ${testGrant2._id}`);

    // Test 3: Deny Authorization Grant
    console.log("\n📝 Testing DENY endpoint...");

    const denyPayload = {
      grantId: testGrant2._id.toString(),
      reason: "Testing deny functionality",
    };

    try {
      const { response: denyResponse, data: denyData } = await makeAuthenticatedRequest(
        `${TEST_CONFIG.baseUrl}/api/v1/authorizations/deny`,
        {
          method: "PATCH",
          body: JSON.stringify(denyPayload),
        },
        patientToken
      );

      if (denyResponse.ok) {
        console.log("✅ Deny endpoint responded successfully");
        console.log(`   Status: ${denyData.data?.newStatus}`);
        console.log(`   Grant ID: ${denyData.data?.grantId}`);
        console.log(`   Action: ${denyData.data?.action}`);

        // Verify the grant was actually updated in the database
        const updatedGrant2 = await AuthorizationGrant.findById(testGrant2._id);
        console.log(`   Database Status: ${updatedGrant2.grantDetails?.status}`);

        if (updatedGrant2.grantDetails?.status === "REVOKED") {
          console.log("✅ Grant status correctly updated to REVOKED");
        } else {
          console.log(`❌ Expected REVOKED, got ${updatedGrant2.grantDetails?.status}`);
        }
      } else {
        console.log(`❌ Deny endpoint failed: ${denyResponse.status}`);
        console.log(`   Error: ${denyData.error}`);
        console.log(`   Details: ${denyData.details || "No details"}`);
      }
    } catch (error) {
      console.log(`❌ Deny endpoint request failed: ${error.message}`);
    }

    // Test 4: Test Authorization History API
    console.log("\n📝 Testing Authorization History endpoint...");

    try {
      const { response: historyResponse, data: historyData } = await makeAuthenticatedRequest(
        `${TEST_CONFIG.baseUrl}/api/patient/authorization-history?limit=10`,
        { method: "GET" },
        patientToken
      );

      if (historyResponse.ok) {
        console.log("✅ Authorization history endpoint responded successfully");
        console.log(`   Total grants found: ${historyData.data?.grants?.length || 0}`);

        historyData.data?.grants?.forEach((grant, index) => {
          console.log(`   ${index + 1}. Grant ${grant.grantId} - Status: ${grant.status}`);
          console.log(`      Organization: ${grant.organization?.organizationInfo?.name || "Unknown"}`);
          console.log(`      Requester: ${grant.requester?.name || "Unknown"} (${grant.requester?.type || "Unknown"})`);
        });
      } else {
        console.log(`❌ Authorization history endpoint failed: ${historyResponse.status}`);
        console.log(`   Error: ${historyData.error}`);
      }
    } catch (error) {
      console.log(`❌ Authorization history request failed: ${error.message}`);
    }

    // Test 5: Test error cases
    console.log("\n📝 Testing error cases...");

    // Test approving an already approved grant
    try {
      const { response: errorResponse, data: errorData } = await makeAuthenticatedRequest(
        `${TEST_CONFIG.baseUrl}/api/v1/authorizations/approve`,
        {
          method: "PATCH",
          body: JSON.stringify({ grantId: testGrant._id.toString() }),
        },
        patientToken
      );

      if (!errorResponse.ok) {
        console.log("✅ Correctly rejected approval of already approved grant");
        console.log(`   Error: ${errorData.error}`);
      } else {
        console.log("❌ Should have rejected approval of already approved grant");
      }
    } catch (error) {
      console.log(`✅ Correctly threw error for duplicate approval: ${error.message}`);
    }

    // Test with invalid grant ID
    try {
      const { response: invalidResponse, data: invalidData } = await makeAuthenticatedRequest(
        `${TEST_CONFIG.baseUrl}/api/v1/authorizations/approve`,
        {
          method: "PATCH",
          body: JSON.stringify({ grantId: "invalid-grant-id" }),
        },
        patientToken
      );

      if (!invalidResponse.ok) {
        console.log("✅ Correctly rejected invalid grant ID");
        console.log(`   Error: ${invalidData.error}`);
      } else {
        console.log("❌ Should have rejected invalid grant ID");
      }
    } catch (error) {
      console.log(`✅ Correctly threw error for invalid grant ID: ${error.message}`);
    }

    console.log("\n🎉 All tests completed!");

    // Cleanup test grants
    console.log("\n🧹 Cleaning up test grants...");
    await AuthorizationGrant.deleteMany({ _id: { $in: [testGrant._id, testGrant2._id] } });
    console.log("✅ Test grants cleaned up");
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    throw error;
  } finally {
    console.log("\n🔐 Database connection closed");
    await mongoose.connection.close();
  }
}

// Main execution
if (require.main === module) {
  testApproveDenyEndpoints()
    .then(() => {
      console.log("\n✅ Approve/Deny endpoint tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Approve/Deny endpoint tests failed:", error.message);
      console.error("Stack trace:", error.stack);
      process.exit(1);
    });
}

module.exports = { testApproveDenyEndpoints };
