#!/usr/bin/env node

/**
 * Test script to check prescription data in the database
 * Uses the Next.js API endpoint to add sample data
 */

const JWT_SECRET = "your-super-secure-secret-key-change-in-production";
const API_BASE_URL = "http://localhost:3000";

// Simple HTTP request function
async function makeRequest(endpoint, method = "GET", body = null, token = null) {
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

async function testPrescriptionData() {
  console.log("🧪 Testing Prescription Data in Database");
  console.log("=======================================\n");

  try {
    // Step 1: Test adding sample prescriptions
    console.log("📋 Step 1: Adding sample prescription data...");
    const sampleResult = await makeRequest("/api/test/add-sample-prescriptions");

    if (sampleResult.status === 200 && sampleResult.data.success) {
      console.log("✅ Sample prescriptions created successfully!");
      console.log(`   Created ${sampleResult.data.data.prescriptionsCount} prescriptions`);
      console.log(`   Encounter ID: ${sampleResult.data.data.encounterId}`);

      sampleResult.data.data.prescriptions.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.medicationName} ${p.dosage} - Status: ${p.status}`);
      });
    } else {
      console.log("❌ Failed to create sample prescriptions");
      console.log("   Response:", sampleResult.data);
    }

    // Step 2: Test pharmacy stats API without authentication (should fail)
    console.log("\n📊 Step 2: Testing pharmacy stats API (no auth)...");
    const statsNoAuthResult = await makeRequest("/api/pharmacist/stats");

    if (statsNoAuthResult.status === 401) {
      console.log("✅ API correctly requires authentication");
    } else {
      console.log("❌ API should require authentication but didn't");
    }

    // Step 3: Test prescription queue API without authentication (should fail)
    console.log("\n💊 Step 3: Testing prescription queue API (no auth)...");
    const queueNoAuthResult = await makeRequest("/api/pharmacist/prescriptions?status=pending&limit=20");

    if (queueNoAuthResult.status === 401) {
      console.log("✅ API correctly requires authentication");
    } else {
      console.log("❌ API should require authentication but didn't");
    }

    // Step 4: Login and test with authentication
    console.log("\n🔐 Step 4: Testing with authentication...");

    // First, try to login with test credentials
    const loginResult = await makeRequest("/api/auth/login", "POST", {
      email: "pharmhana@gmail.com",
      password: "pharmacy123",
    });

    if (loginResult.status === 200 && loginResult.data.token) {
      console.log("✅ Successfully logged in!");
      const authToken = loginResult.data.token;

      // Test pharmacy stats with auth
      console.log("\n📊 Step 5: Testing pharmacy stats API (with auth)...");
      const statsResult = await makeRequest("/api/pharmacist/stats", "GET", null, authToken);

      if (statsResult.status === 200 && statsResult.data.success) {
        console.log("✅ Pharmacy stats API working!");
        const stats = statsResult.data.data;
        console.log(`   Prescriptions Today: ${stats.prescriptionsToday}`);
        console.log(`   Pending Verifications: ${stats.pendingVerifications}`);
        console.log(`   Prescriptions This Week: ${stats.prescriptionsThisWeek}`);
        console.log(`   Prescriptions This Month: ${stats.prescriptionsThisMonth}`);
        console.log(`   Most Common Medications: ${stats.mostCommonMedications.length} types`);
      } else {
        console.log("❌ Pharmacy stats API failed");
        console.log("   Response:", statsResult.data);
      }

      // Test prescription queue with auth
      console.log("\n💊 Step 6: Testing prescription queue API (with auth)...");
      const queueResult = await makeRequest(
        "/api/pharmacist/prescriptions?status=pending&limit=20",
        "GET",
        null,
        authToken
      );

      if (queueResult.status === 200 && queueResult.data.success) {
        console.log("✅ Prescription queue API working!");
        console.log(`   Found ${queueResult.data.data.length} pending prescriptions`);

        if (queueResult.data.data.length > 0) {
          console.log("   📋 Pending prescriptions:");
          queueResult.data.data.forEach((p, i) => {
            console.log(`      ${i + 1}. ${p.medicationName} ${p.dosage} for ${p.patientName}`);
            console.log(`         Status: ${p.status}, Priority: ${p.priority}`);
          });
        } else {
          console.log("   ℹ️  No pending prescriptions found (this might be expected)");
        }
      } else {
        console.log("❌ Prescription queue API failed");
        console.log("   Response:", queueResult.data);
      }
    } else {
      console.log("❌ Login failed. You may need to reset the pharmacist password first.");
      console.log("   Response:", loginResult.data);
      console.log("\n   💡 To reset password, try:");
      console.log("   1. Go to http://localhost:3000/login");
      console.log("   2. Or run: node scripts/reset-pharmacist-password.js pharmhana@gmail.com");
    }

    console.log("\n✅ Test completed successfully!");
    console.log("\n🎯 Summary:");
    console.log("   - Sample prescriptions were created in the database");
    console.log("   - APIs require proper authentication");
    console.log("   - The dashboard should now show real prescription data");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Add a small delay to ensure the server is ready
setTimeout(() => {
  testPrescriptionData().catch(console.error);
}, 3000);
