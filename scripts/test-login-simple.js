#!/usr/bin/env node
/**
 * Test Login with Simple Credentials
 */

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000";

async function testLogin() {
  console.log("🔐 Testing Login with pharmhana / 12345678");
  console.log("============================================\n");

  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "pharmhana",
        password: "12345678",
      }),
    });

    const loginData = await loginResponse.json();

    if (loginResponse.ok && loginData.success) {
      console.log("✅ Login successful!");
      console.log("   User:", loginData.user.email);
      console.log("   Role:", loginData.user.role);
      console.log("   Token received:", loginData.token ? "Yes" : "No");

      if (loginData.token) {
        // Test authenticated API calls
        console.log("\n📊 Testing pharmacy stats with authentication...");
        const statsResponse = await fetch(`${BASE_URL}/api/pharmacist/stats`, {
          headers: {
            Authorization: `Bearer ${loginData.token}`,
          },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log("✅ Stats API successful:");
          console.log("   Pending Verifications:", statsData.pendingVerifications);
          console.log("   Prescriptions Today:", statsData.prescriptionsToday);
        } else {
          const errorData = await statsResponse.json();
          console.log("❌ Stats API failed:", errorData);
        }

        console.log("\n💊 Testing prescription queue with authentication...");
        const queueResponse = await fetch(`${BASE_URL}/api/pharmacist/prescriptions?status=pending&limit=20`, {
          headers: {
            Authorization: `Bearer ${loginData.token}`,
          },
        });

        if (queueResponse.ok) {
          const queueData = await queueResponse.json();
          console.log("✅ Queue API successful:");
          console.log("   Pending Prescriptions:", queueData.prescriptions?.length || 0);
          if (queueData.prescriptions && queueData.prescriptions.length > 0) {
            queueData.prescriptions.forEach((p, i) => {
              console.log(`   ${i + 1}. ${p.medicationName} for ${p.patientName} (${p.status})`);
            });
          }
        } else {
          const errorData = await queueResponse.json();
          console.log("❌ Queue API failed:", errorData);
        }
      }
    } else {
      console.log("❌ Login failed:");
      console.log("   Status:", loginResponse.status);
      console.log("   Response:", loginData);
    }
  } catch (error) {
    console.error("❌ Error during login test:", error.message);
  }
}

testLogin();
