#!/usr/bin/env node

// Test script for new pharmacist endpoints
const LOGIN_URL = "http://localhost:3001/api/auth/login";
const MEDICATIONS_URL = "http://localhost:3001/api/pharmacist/patient";
const RECORDS_URL = "http://localhost:3001/api/pharmacist/patient";
const DISPENSE_URL = "http://localhost:3001/api/pharmacist/patient";

// Test credentials
const testEmail = "pharmhana@gmail.com";
const testPassword = "12345678";

async function testPharmacistEndpoints() {
  console.log("🧪 Testing New Pharmacist Endpoints");
  console.log("=".repeat(50));

  try {
    // Step 1: Login to get auth token
    console.log("\n🔐 Step 1: Logging in as pharmacist...");
    console.log(`   Email: ${testEmail}`);

    const loginResponse = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    if (!loginResponse.ok) {
      console.log("❌ Login failed.");
      console.log("   Response status:", loginResponse.status);
      const errorData = await loginResponse.json().catch(() => ({}));
      console.log("   Error:", errorData.error || "Unknown error");
      return;
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.token;

    if (!authToken) {
      console.log("❌ No auth token received from login");
      return;
    }

    console.log("✅ Login successful! Auth token received.");

    // For testing, we need a real digital ID from the database
    // Let's use a placeholder for now - in real usage this would come from QR scan
    const testDigitalId = "HID_test-patient-123";

    // Step 2: Test Medications Endpoint
    console.log("\n💊 Step 2: Testing Medications Endpoint...");
    const medicationsResponse = await fetch(`${MEDICATIONS_URL}/${testDigitalId}/medications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`   Status: ${medicationsResponse.status}`);
    if (medicationsResponse.ok) {
      const medicationsData = await medicationsResponse.json();
      console.log("✅ Medications endpoint accessible!");
      console.log(`   Response: ${JSON.stringify(medicationsData, null, 2)}`);
    } else {
      const errorData = await medicationsResponse.json().catch(() => ({}));
      console.log("⚠️ Medications endpoint returned:", medicationsResponse.status);
      console.log("   Error:", errorData.error || "Unknown error");
    }

    // Step 3: Test Records Endpoint
    console.log("\n📋 Step 3: Testing Records Endpoint...");
    const recordsResponse = await fetch(`${RECORDS_URL}/${testDigitalId}/records`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`   Status: ${recordsResponse.status}`);
    if (recordsResponse.ok) {
      const recordsData = await recordsResponse.json();
      console.log("✅ Records endpoint accessible!");
      console.log(`   Response: ${JSON.stringify(recordsData, null, 2)}`);
    } else {
      const errorData = await recordsResponse.json().catch(() => ({}));
      console.log("⚠️ Records endpoint returned:", recordsResponse.status);
      console.log("   Error:", errorData.error || "Unknown error");
    }

    // Step 4: Test Dispense Endpoint
    console.log("\n🏥 Step 4: Testing Dispense Endpoint...");
    const dispenseResponse = await fetch(`${DISPENSE_URL}/${testDigitalId}/dispense`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prescriptionId: "test-prescription-123",
        medicationId: "test-medication-456",
        quantityDispensed: 30,
        dispensedBy: "pharmhana@gmail.com",
        notes: "Test dispensation",
      }),
    });

    console.log(`   Status: ${dispenseResponse.status}`);
    if (dispenseResponse.ok) {
      const dispenseData = await dispenseResponse.json();
      console.log("✅ Dispense endpoint accessible!");
      console.log(`   Response: ${JSON.stringify(dispenseData, null, 2)}`);
    } else {
      const errorData = await dispenseResponse.json().catch(() => ({}));
      console.log("⚠️ Dispense endpoint returned:", dispenseResponse.status);
      console.log("   Error:", errorData.error || "Unknown error");
    }
  } catch (error) {
    console.log("❌ Test failed with error:", error.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🏁 New Pharmacist Endpoints Test completed!");
  console.log("\nEndpoints tested:");
  console.log("- POST /api/auth/login");
  console.log("- GET /api/pharmacist/patient/{digitalId}/medications");
  console.log("- GET /api/pharmacist/patient/{digitalId}/records");
  console.log("- POST /api/pharmacist/patient/{digitalId}/dispense");
  console.log("\nNext: Test the UI components by logging into the dashboard");
}

// Run the test
testPharmacistEndpoints().catch(console.error);
