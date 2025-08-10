const axios = require("axios");

async function testChatAPI() {
  console.log("🧪 Testing Groq Healthcare AI Chat API...\n");

  const testCases = [
    {
      name: "Basic Health Question",
      message: "What are the symptoms of high blood pressure?",
      sessionType: "general",
    },
    {
      name: "Emergency Detection Test",
      message: "I'm having severe chest pain and can't breathe",
      sessionType: "emergency_triage",
    },
    {
      name: "Simple Question",
      message: "How much water should I drink daily?",
      sessionType: "general",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`💬 Message: ${testCase.message}`);

    try {
      const response = await axios.post(
        "http://localhost:3000/api/ai/chat",
        {
          message: testCase.message,
          sessionId: `test-${Date.now()}`,
          sessionType: testCase.sessionType,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer mock-token", // Mock token for testing
          },
          timeout: 30000,
        }
      );

      console.log(`✅ Status: ${response.status}`);
      console.log(`🤖 Response: ${response.data.response?.substring(0, 200)}...`);
      console.log(`🔥 Emergency Detected: ${response.data.emergencyDetected || false}`);
      console.log(`🪙 Tokens Used: ${response.data.tokensUsed || 0}`);
      console.log(`⚡ Model: ${response.data.modelUsed || "mock"}`);
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status || error.code}`);
      console.log(`📄 Message: ${error.response?.data?.error || error.message}`);

      if (error.response?.data) {
        console.log(`📋 Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
    }

    console.log("─".repeat(80));
  }

  console.log("\n🏁 Test completed!");
}

testChatAPI().catch(console.error);
