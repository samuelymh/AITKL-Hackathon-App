#!/usr/bin/env node

/**
 * End-to-end Test for Approve/Deny Endpoints
 * Tests the complete flow including API endpoints
 */

const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

// Configuration from .env.local
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const API_BASE_URL = "http://localhost:3000";

async function generateTestJWT(userId, digitalIdentifier, role = "patient") {
  const payload = {
    userId,
    digitalIdentifier,
    role,
    iss: "health-app",
    aud: "health-app-users",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

async function makeAPIRequest(endpoint, method = "GET", body = null, token = null) {
  // Use built-in fetch (Node 18+) or require https module
  const https = require("https");
  const http = require("http");

  return new Promise((resolve, reject) => {
    const fullUrl = new URL(endpoint, API_BASE_URL);
    const isHttps = fullUrl.protocol === "https:";
    const requestModule = isHttps ? https : http;

    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = requestModule.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const data = JSON.parse(responseData);
          resolve({ status: res.statusCode, data });
        } catch (parseError) {
          console.warn("Failed to parse JSON response:", parseError.message);
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testEndToEndApproval() {
  let mongoClient;

  try {
    console.log("\n🔍 End-to-End Approve/Deny API Test\n");

    // Connect to MongoDB directly for setup
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("✅ Connected to database");

    const db = mongoClient.db();
    const authGrantsCollection = db.collection("authorization_grants");
    const notificationJobsCollection = db.collection("notification_jobs");
    const usersCollection = db.collection("users");
    const organizationsCollection = db.collection("organizations");
    const practitionersCollection = db.collection("practitioners");

    // 1. Find test patient user
    console.log("\n📋 Step 1: Finding test patient user...");
    let testPatient = await usersCollection.findOne({
      $or: [{ "auth.role": "patient" }, { role: "patient" }],
    });

    if (!testPatient) {
      console.log("❌ No patient users found in database");
      return;
    }

    console.log(`✅ Found test patient: ${testPatient.digitalIdentifier || testPatient._id}`);

    // 2. Find test organization and practitioner
    const testOrg = await organizationsCollection.findOne();
    const testPractitioner = await practitionersCollection.findOne();

    if (!testOrg || !testPractitioner) {
      console.log("❌ Missing test organization or practitioner");
      return;
    }

    console.log(`✅ Found test organization: ${testOrg.organizationInfo?.name || testOrg._id}`);
    console.log(`✅ Found test practitioner: ${testPractitioner._id}`);

    // 3. Create test authorization grant directly in DB
    console.log("\n📋 Step 2: Creating test authorization grant...");
    const testGrantId = new ObjectId();
    const testGrant = {
      _id: testGrantId,
      userId: testPatient._id,
      organizationId: testOrg._id,
      requestingPractitionerId: testPractitioner._id,
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
        userAgent: "Test Script",
        deviceInfo: { type: "script" },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      auditCreatedBy: "test-script",
    };

    await authGrantsCollection.insertOne(testGrant);
    console.log(`✅ Created test grant: ${testGrantId}`);

    // 4. Create corresponding notification job
    const testNotificationId = new ObjectId();
    const testNotification = {
      _id: testNotificationId,
      type: "AUTHORIZATION_REQUEST",
      status: "PENDING",
      priority: 5,
      scheduledAt: new Date(),
      payload: {
        title: "Test Authorization Request",
        body: "Test authorization request for API testing",
        data: {
          grantId: testGrantId.toString(),
          patientId: testPatient.digitalIdentifier || testPatient._id.toString(),
          organizationId: testOrg._id.toString(),
          requestingPractitionerId: testPractitioner._id.toString(),
          organizationName: testOrg.organizationInfo?.name || "Test Organization",
          timeWindowHours: 24,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await notificationJobsCollection.insertOne(testNotification);
    console.log(`✅ Created test notification: ${testNotificationId}`);

    // 5. Generate JWT token for patient
    console.log("\n📋 Step 3: Generating JWT token...");
    const patientToken = await generateTestJWT(
      testPatient._id.toString(),
      testPatient.digitalIdentifier || testPatient._id.toString(),
      "patient"
    );
    console.log("✅ Generated JWT token for patient");

    // 6. Test the APPROVE API endpoint
    console.log("\n📋 Step 4: Testing APPROVE API endpoint...");
    const approvePayload = {
      grantId: testGrantId.toString(),
      reason: "Testing API approve functionality",
    };

    const approveResult = await makeAPIRequest("/api/v1/authorizations/approve", "PATCH", approvePayload, patientToken);

    console.log(`   API Response Status: ${approveResult.status}`);
    console.log(`   API Response:`, JSON.stringify(approveResult.data, null, 2));

    if (approveResult.status === 200 && approveResult.data.success) {
      console.log("✅ APPROVE API endpoint worked correctly");

      // Verify in database
      const updatedGrant = await authGrantsCollection.findOne({ _id: testGrantId });
      const updatedNotification = await notificationJobsCollection.findOne({ _id: testNotificationId });

      console.log(`   Database Grant Status: ${updatedGrant?.grantDetails?.status}`);
      console.log(`   Database Notification Status: ${updatedNotification?.status}`);

      if (updatedGrant?.grantDetails?.status === "ACTIVE") {
        console.log("✅ Grant status correctly updated to ACTIVE in database");
      }

      if (updatedNotification?.status === "COMPLETED") {
        console.log("✅ Notification status correctly updated to COMPLETED in database");
      }
    } else {
      console.log("❌ APPROVE API endpoint failed");
      console.log("   Error details:", approveResult.data);
    }

    // 7. Create second grant for DENY test
    console.log("\n📋 Step 5: Creating second grant for DENY test...");
    const testGrantId2 = new ObjectId();
    const testGrant2 = {
      ...testGrant,
      _id: testGrantId2,
      grantDetails: {
        ...testGrant.grantDetails,
        status: "PENDING",
      },
    };

    await authGrantsCollection.insertOne(testGrant2);
    console.log(`✅ Created second test grant: ${testGrantId2}`);

    // 8. Test the DENY API endpoint
    console.log("\n📋 Step 6: Testing DENY API endpoint...");
    const denyPayload = {
      grantId: testGrantId2.toString(),
      reason: "Testing API deny functionality",
    };

    const denyResult = await makeAPIRequest("/api/v1/authorizations/deny", "PATCH", denyPayload, patientToken);

    console.log(`   API Response Status: ${denyResult.status}`);
    console.log(`   API Response:`, JSON.stringify(denyResult.data, null, 2));

    if (denyResult.status === 200 && denyResult.data.success) {
      console.log("✅ DENY API endpoint worked correctly");

      // Verify in database
      const deniedGrant = await authGrantsCollection.findOne({ _id: testGrantId2 });

      console.log(`   Database Grant Status: ${deniedGrant?.grantDetails?.status}`);

      if (deniedGrant?.grantDetails?.status === "REVOKED") {
        console.log("✅ Grant status correctly updated to REVOKED in database");
      }
    } else {
      console.log("❌ DENY API endpoint failed");
      console.log("   Error details:", denyResult.data);
    }

    // 9. Test Authorization History API
    console.log("\n📋 Step 7: Testing Authorization History API...");
    const historyResult = await makeAPIRequest(
      "/api/patient/authorization-history?limit=10",
      "GET",
      null,
      patientToken
    );

    console.log(`   History API Response Status: ${historyResult.status}`);
    if (historyResult.status === 200) {
      console.log("✅ Authorization History API working");
      console.log(`   Found ${historyResult.data.data?.grants?.length || 0} grants in history`);
    } else {
      console.log("❌ Authorization History API failed");
      console.log("   Error details:", historyResult.data);
    }

    // 10. Cleanup test data
    console.log("\n📋 Step 8: Cleaning up test data...");
    await authGrantsCollection.deleteMany({
      _id: { $in: [testGrantId, testGrantId2] },
    });
    await notificationJobsCollection.deleteOne({ _id: testNotificationId });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 End-to-end API test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error(error.stack);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log("\n🔐 Database connection closed");
    }
  }
}

// Run the test
if (require.main === module) {
  testEndToEndApproval();
}

module.exports = { testEndToEndApproval };
