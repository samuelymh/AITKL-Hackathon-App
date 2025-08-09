#!/usr/bin/env node

/**
 * Test Medical History API
 * Tests the doctor medical history endpoint with proper authentication
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment
const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

const BASE_URL = "http://localhost:3000";

// Mock fetch for Node.js (using HTTPS module)
async function makeRequest(url, options = {}) {
  const https = require("https");
  const http = require("http");

  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url);
    const isHttps = fullUrl.protocol === "https:";
    const requestModule = isHttps ? https : http;

    const requestOptions = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (isHttps ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = requestModule.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (parseError) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testMedicalHistoryAPI() {
  let mongoClient;

  try {
    console.log("\n🔍 Testing Medical History API\n");

    // Connect to MongoDB to check data
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("✅ Connected to database");

    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const authGrantsCollection = db.collection("authorization_grants");
    const encountersCollection = db.collection("encounters");
    const practitionersCollection = db.collection("practitioners");
    const organizationMembersCollection = db.collection("organization_members");

    // Step 1: Login with a doctor account
    console.log("\n📋 Step 1: Testing doctor login...");
    const loginResult = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      body: {
        email: "dr.sarah.johnson@medicenter.com",
        password: "Doctor123!",
      },
    });

    console.log(`   Login Status: ${loginResult.status}`);

    if (loginResult.status !== 200 || !loginResult.data.success) {
      console.log("❌ Login failed:", loginResult.data);
      return;
    }

    const token = loginResult.data.data.accessToken;
    const doctorUserId = loginResult.data.data.user.id;
    console.log("✅ Login successful");
    console.log(`   Doctor ID: ${doctorUserId}`);

    // Step 2: Check if patient exists
    console.log("\n📋 Step 2: Checking patient...");
    const targetPatientId = "HID_12d542e1-22e3-4a22-9504-3dd7e1fc8845";
    const patient = await usersCollection.findOne({
      digitalIdentifier: targetPatientId,
      "auth.role": "patient",
    });

    if (!patient) {
      console.log("❌ Patient not found with digital ID:", targetPatientId);

      // List available patients
      const patients = await usersCollection
        .find({
          "auth.role": "patient",
        })
        .limit(5)
        .toArray();

      console.log(`\n📋 Available patients (first 5):`);
      patients.forEach((p, i) => {
        console.log(
          `   ${i + 1}. ${p.digitalIdentifier} - ${p.personalInfo?.firstName || "Unknown"} ${p.personalInfo?.lastName || "Unknown"}`
        );
      });

      if (patients.length > 0) {
        console.log(`\n🔄 Testing with first available patient: ${patients[0].digitalIdentifier}`);
        return testWithPatient(patients[0].digitalIdentifier, token, doctorUserId, db);
      } else {
        console.log("❌ No patients found in database");
        return;
      }
    }

    console.log("✅ Patient found:", patient.digitalIdentifier);

    // Test with the original patient
    return testWithPatient(targetPatientId, token, doctorUserId, db);
  } catch (error) {
    console.error("❌ Error during test:", error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

async function testWithPatient(patientDigitalId, token, doctorUserId, db) {
  try {
    console.log(`\n📋 Step 3: Testing medical history for patient ${patientDigitalId}...`);

    const usersCollection = db.collection("users");
    const practitionersCollection = db.collection("practitioners");
    const organizationMembersCollection = db.collection("organization_members");
    const authGrantsCollection = db.collection("authorization_grants");

    // Find patient
    const patient = await usersCollection.findOne({
      digitalIdentifier: patientDigitalId,
    });

    if (!patient) {
      console.log("❌ Patient not found");
      return;
    }

    // Check doctor's practitioner record
    console.log("\n📋 Step 4: Checking doctor's practitioner record...");
    const practitioner = await practitionersCollection.findOne({
      userId: { $in: [doctorUserId, { $oid: doctorUserId }] },
    });

    if (!practitioner) {
      console.log("❌ Doctor practitioner record not found");
      console.log(`   Looking for userId: ${doctorUserId}`);

      // List available practitioners
      const practitioners = await practitionersCollection.find({}).limit(5).toArray();
      console.log("\n📋 Available practitioners:");
      practitioners.forEach((p, i) => {
        console.log(`   ${i + 1}. ID: ${p._id}, UserID: ${p.userId}`);
      });
      return;
    }

    console.log("✅ Practitioner found:", practitioner._id);

    // Check organization membership
    console.log("\n📋 Step 5: Checking organization membership...");
    const orgMember = await organizationMembersCollection.findOne({
      practitionerId: practitioner._id,
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (!orgMember) {
      console.log("❌ No active organization membership found");
      return;
    }

    console.log("✅ Organization membership found:", orgMember.organizationId);

    // Check authorization grant
    console.log("\n📋 Step 6: Checking authorization grant...");
    const activeGrant = await authGrantsCollection.findOne({
      userId: patient._id,
      organizationId: orgMember.organizationId,
      $or: [
        {
          "grantDetails.status": "ACTIVE",
          "grantDetails.expiresAt": { $gt: new Date() },
        },
        {
          status: "approved",
          expiresAt: { $gt: new Date() },
        },
      ],
      $and: [
        {
          $or: [{ "accessScope.canViewMedicalHistory": true }, { "permissions.canViewMedicalHistory": true }],
        },
      ],
    });

    if (!activeGrant) {
      console.log("❌ No active authorization grant found");
      console.log("   Creating a test authorization grant...");

      // Create a test grant
      const testGrant = {
        userId: patient._id,
        organizationId: orgMember.organizationId,
        grantDetails: {
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          timeWindowHours: 24,
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
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        auditCreatedBy: "test-script",
      };

      await authGrantsCollection.insertOne(testGrant);
      console.log("✅ Test authorization grant created");
    } else {
      console.log("✅ Active authorization grant found");
    }

    // Now test the API endpoint
    console.log("\n📋 Step 7: Testing API endpoint...");
    const medicalHistoryResult = await makeRequest(
      `${BASE_URL}/api/doctor/patients/${patientDigitalId}/medical-history`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`   API Response Status: ${medicalHistoryResult.status}`);

    if (medicalHistoryResult.status === 200) {
      console.log("✅ Medical history API successful!");
      console.log("   Response data:", JSON.stringify(medicalHistoryResult.data, null, 2));
    } else {
      console.log("❌ Medical history API failed");
      console.log("   Error response:", JSON.stringify(medicalHistoryResult.data, null, 2));
    }
  } catch (error) {
    console.error("❌ Error in testWithPatient:", error);
  }
}

// Run the test
if (require.main === module) {
  testMedicalHistoryAPI();
}

module.exports = { testMedicalHistoryAPI };
