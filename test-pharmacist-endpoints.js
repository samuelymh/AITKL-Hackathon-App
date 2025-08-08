const fetch = require("node-fetch");

async function testPharmacistEndpoints() {
  const baseUrl = "http://localhost:3001";

  // Mock patient digital ID for testing
  const digitalId = "patient_12345";

  console.log("Testing Pharmacist API Endpoints...\n");

  // Test 1: Medications endpoint
  console.log("1. Testing medications endpoint...");
  try {
    const response = await fetch(`${baseUrl}/api/pharmacist/patient/${digitalId}/medications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Note: In real usage, this would need a valid Bearer token
        Authorization: "Bearer test-token",
      },
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 2: Records endpoint
  console.log("2. Testing records endpoint...");
  try {
    const response = await fetch(`${baseUrl}/api/pharmacist/patient/${digitalId}/records`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Dispense endpoint
  console.log("3. Testing dispense endpoint...");
  try {
    const response = await fetch(`${baseUrl}/api/pharmacist/patient/${digitalId}/dispense`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        prescriptionId: "rx_12345",
        medicationId: "med_67890",
        quantityDispensed: 30,
        instructions: "Take one tablet daily with food",
        notes: "Patient counseled on side effects",
      }),
    });

    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  console.log("Test completed!");
}

testPharmacistEndpoints();
