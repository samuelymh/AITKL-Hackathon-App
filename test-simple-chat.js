#!/usr/bin/env node

/**
 * Simple AI Chat API Test
 * Quick test to verify the chat API is working
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secure-secret-key-change-in-production";
const API_URL = "http://localhost:3000/api/ai/chat";

async function testChat() {
  console.log("🤖 Testing AI Chat API...\n");

  // Generate a test JWT token
  const token = jwt.sign(
    {
      userId: "test-user-123",
      digitalIdentifier: "HID_test_patient",
      role: "patient",
      iss: "health-app",
      aud: "health-app-users",
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  console.log("✅ Generated JWT token");

  const testMessage = {
    message: "What are the symptoms of high blood pressure?",
    sessionId: "test-session-" + Date.now(),
    sessionType: "general",
    userRole: "patient",
  };

  console.log("📤 Sending request to:", API_URL);
  console.log("💬 Message:", testMessage.message);

  try {
    // Use fetch (Node 18+) or require('node-fetch')
    const fetch = globalThis.fetch || require("node-fetch");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testMessage),
    });

    console.log("📊 Response Status:", response.status);
    console.log("📋 Response Headers:", Object.fromEntries(response.headers.entries()));

    const responseData = await response.text();
    console.log("📄 Raw Response:", responseData);

    if (response.ok) {
      try {
        const jsonData = JSON.parse(responseData);
        console.log("✅ Success!");
        console.log("🤖 AI Response:", jsonData.response?.substring(0, 200) + "...");
        console.log("🚨 Emergency Detected:", jsonData.emergencyDetected || false);
        console.log("🪙 Tokens Used:", jsonData.tokensUsed || 0);
        console.log("⚡ Model Used:", jsonData.modelUsed || "unknown");
      } catch (parseError) {
        console.log("⚠️ Response received but couldn't parse JSON:", parseError.message);
      }
    } else {
      console.log("❌ Request failed with status:", response.status);
      console.log("📄 Error response:", responseData);
    }
  } catch (error) {
    console.log("❌ Request failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("💡 Make sure the development server is running: npm run dev");
    }
  }

  console.log("\n🏁 Test completed!");
}

// Only run if this file is executed directly
if (require.main === module) {
  testChat().catch(console.error);
}

module.exports = { testChat };
