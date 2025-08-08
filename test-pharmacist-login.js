#!/usr/bin/env node

const fetch = require("node-fetch");

async function testPharmacistLogin() {
  console.log("🔐 Testing pharmacist login...");

  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "pharmhana@gmail.com",
        password: "Password123",
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Login successful!");
      console.log("User:", result.user);
      console.log("Token preview:", result.token.substring(0, 50) + "...");

      // Test the token by calling the medications API
      console.log("\n🧪 Testing medications API with token...");
      const medResponse = await fetch(
        "http://localhost:3000/api/pharmacist/patient/HID_12d542e1-22e3-4a22-9504-3dd7e1fc8845/medications",
        {
          headers: {
            Authorization: `Bearer ${result.token}`,
          },
        }
      );

      console.log("Medications API Status:", medResponse.status);
      const medResult = await medResponse.json();
      console.log("Medications API Response:", medResult);
    } else {
      console.log("❌ Login failed:", result);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testPharmacistLogin();
