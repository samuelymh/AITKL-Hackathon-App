#!/usr/bin/env node

/**
 * Test Organizations API
 * Tests the public organizations API endpoint to verify it returns data
 */

const http = require("http");

async function testAPI() {
  try {
    console.log("🧪 Testing Organizations API\n");

    // Test the public organizations endpoint
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/organizations/public?verified=true&limit=50",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, data });
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });

    if (response.status !== 200) {
      console.error(`❌ HTTP Error: ${response.status}`);
      console.log("Response:", response.data);
      return;
    }

    const data = JSON.parse(response.data);
    console.log("✅ API Response received");
    console.log("📊 Response:", JSON.stringify(data, null, 2));

    if (data.success && data.data?.organizations?.length > 0) {
      console.log(`\n🎉 Success! Found ${data.data.organizations.length} organization(s)`);
      data.data.organizations.forEach((org, index) => {
        console.log(`   ${index + 1}. ${org.name} (${org.type})`);
      });
    } else {
      console.log("\n⚠️  No organizations returned");
    }
  } catch (error) {
    console.error("❌ Error testing API:", error.message);
  }
}

testAPI();
