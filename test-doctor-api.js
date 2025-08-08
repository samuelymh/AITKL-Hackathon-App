#!/usr/bin/env node

/**
 * Test script for doctor dashboard functionality
 * Tests the doctor API endpoints and verifies they return expected data
 */

const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthapp";
const BASE_URL = "http://localhost:3002";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Test data
const testDoctorEmail = "test.doctor@example.com";

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db();
}

function generateTestToken(userId, email, role = "doctor") {
  return jwt.sign(
    {
      userId,
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    JWT_SECRET
  );
}

async function makeAPIRequest(endpoint, token, method = "GET", body = null) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return {
    status: response.status,
    data: await response.json(),
  };
}

async function findOrCreateTestDoctor(db) {
  let user = await db.collection("users").findOne({ email: testDoctorEmail });

  if (!user) {
    console.log("Creating test doctor user...");
    const result = await db.collection("users").insertOne({
      email: testDoctorEmail,
      name: "Test Doctor",
      roles: ["doctor"],
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    user = { _id: result.insertedId, email: testDoctorEmail, roles: ["doctor"] };
  }

  return user;
}

async function testDoctorAuthorizations(token, userId) {
  console.log("\n--- Testing Doctor Authorizations API ---");

  try {
    const response = await makeAPIRequest("/api/doctor/authorizations", token);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Doctor authorizations API working");
      return response.data;
    } else {
      console.log("❌ Doctor authorizations API failed");
      return null;
    }
  } catch (error) {
    console.error("Error testing doctor authorizations:", error.message);
    return null;
  }
}

async function testDoctorStats(token, userId) {
  console.log("\n--- Testing Doctor Stats API ---");

  try {
    const response = await makeAPIRequest("/api/doctor/stats", token);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Doctor stats API working");
      return response.data;
    } else {
      console.log("❌ Doctor stats API failed");
      return null;
    }
  } catch (error) {
    console.error("Error testing doctor stats:", error.message);
    return null;
  }
}

async function testDoctorOrganization(token, userId) {
  console.log("\n--- Testing Doctor Organization API ---");

  try {
    const response = await makeAPIRequest("/api/doctor/organization", token);
    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(response.data, null, 2));

    if (response.status === 200) {
      console.log("✅ Doctor organization API working");
      return response.data;
    } else {
      console.log("❌ Doctor organization API failed");
      return null;
    }
  } catch (error) {
    console.error("Error testing doctor organization:", error.message);
    return null;
  }
}

async function testDoctorProfessionalInfo(token, userId) {
  console.log("\n--- Testing Doctor Professional Info API ---");

  try {
    // Test GET
    const getResponse = await makeAPIRequest("/api/doctor/professional-info", token);
    console.log(`GET Status: ${getResponse.status}`);
    console.log("GET Response:", JSON.stringify(getResponse.data, null, 2));

    // Test POST with sample data
    const sampleData = {
      licenseNumber: "MD123456",
      specialty: "Internal Medicine",
      practitionerType: "internal_medicine",
      yearsOfExperience: 5,
      currentPosition: "Attending Physician",
      department: "Internal Medicine",
      metadata: {
        testData: true,
      },
    };

    const postResponse = await makeAPIRequest("/api/doctor/professional-info", token, "POST", sampleData);
    console.log(`POST Status: ${postResponse.status}`);
    console.log("POST Response:", JSON.stringify(postResponse.data, null, 2));

    if (getResponse.status === 200 && postResponse.status === 200) {
      console.log("✅ Doctor professional info API working");
      return { get: getResponse.data, post: postResponse.data };
    } else {
      console.log("❌ Doctor professional info API failed");
      return null;
    }
  } catch (error) {
    console.error("Error testing doctor professional info:", error.message);
    return null;
  }
}

async function verifyDatabaseData(db, userId) {
  console.log("\n--- Verifying Database Data ---");

  try {
    // Check user
    const user = await db.collection("users").findOne({ _id: userId });
    console.log("User roles:", user?.roles);

    // Check practitioner
    const practitioner = await db.collection("practitioners").findOne({ userId: userId });
    console.log("Practitioner found:", !!practitioner);
    if (practitioner) {
      console.log("Practitioner type:", practitioner.professionalInfo?.practitionerType);
      console.log("License number:", practitioner.professionalInfo?.licenseNumber);
    }

    // Check organization memberships
    const memberships = await db
      .collection("organizationmembers")
      .find({ practitionerId: practitioner?._id })
      .toArray();
    console.log("Organization memberships:", memberships.length);

    console.log("✅ Database verification complete");
  } catch (error) {
    console.error("Error verifying database data:", error.message);
  }
}

async function main() {
  console.log("🏥 Doctor Dashboard API Test Script");
  console.log("=====================================");

  try {
    // Connect to database
    console.log("Connecting to database...");
    const db = await connectToDatabase();
    console.log("✅ Connected to MongoDB");

    // Find or create test doctor
    const testUser = await findOrCreateTestDoctor(db);
    console.log(`✅ Test doctor: ${testUser.email} (ID: ${testUser._id})`);

    // Generate JWT token
    const token = generateTestToken(testUser._id.toString(), testUser.email, "doctor");
    console.log("✅ Generated JWT token");

    // Test all doctor API endpoints
    const authResults = await testDoctorAuthorizations(token, testUser._id);
    const statsResults = await testDoctorStats(token, testUser._id);
    const orgResults = await testDoctorOrganization(token, testUser._id);
    const profileResults = await testDoctorProfessionalInfo(token, testUser._id);

    // Verify database data
    await verifyDatabaseData(db, testUser._id);

    // Summary
    console.log("\n--- Test Summary ---");
    console.log(`Authorizations API: ${authResults ? "✅" : "❌"}`);
    console.log(`Stats API: ${statsResults ? "✅" : "❌"}`);
    console.log(`Organization API: ${orgResults ? "✅" : "❌"}`);
    console.log(`Professional Info API: ${profileResults ? "✅" : "❌"}`);

    if (authResults && statsResults && orgResults && profileResults) {
      console.log("\n🎉 All doctor dashboard APIs are working correctly!");
    } else {
      console.log("\n⚠️  Some doctor dashboard APIs need attention");
    }
  } catch (error) {
    console.error("Test script error:", error);
  } finally {
    process.exit(0);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
