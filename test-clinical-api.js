const https = require("https");

// Test the clinical analysis API directly
async function testClinicalAnalysisAPI() {
  try {
    console.log("🔍 Testing Clinical Analysis API Directly...\n");

    const testPatientId = "676b36e35db4caad6ac67b51";
    const testMessage = "What are the key clinical considerations for this patient?";

    console.log("📋 Test Parameters:");
    console.log("- Patient ID:", testPatientId);
    console.log("- Message:", testMessage);
    console.log("- Session Type: clinical_analysis");
    console.log("- User Role: doctor\n");

    const payload = {
      sessionId: "test-session-" + Date.now(),
      message: testMessage,
      sessionType: "clinical_analysis",
      userRole: "doctor", // Top level userRole
      context: {
        patientId: testPatientId,
        userId: testPatientId,
      },
      conversationHistory: [],
    };

    console.log("📤 API Payload:");
    console.log(JSON.stringify(payload, null, 2));
    console.log("");

    const postData = JSON.stringify(payload);

    const options = {
      hostname: "localhost",
      port: 3001,
      path: "/api/ai/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        // Add basic auth header (you may need to adjust this)
        Authorization: "Bearer test-token",
      },
    };

    console.log("🌐 Making API request to http://localhost:3001/api/ai/chat...");

    const req = https.request(options, (res) => {
      console.log("📡 Response status:", res.statusCode);
      console.log("📡 Response headers:", res.headers);

      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("\n📥 API Response:");
        console.log("=".repeat(80));

        try {
          const response = JSON.parse(data);
          console.log(JSON.stringify(response, null, 2));

          if (response.success && response.response) {
            console.log("\n🎯 Response Analysis:");
            console.log("- Success:", response.success);
            console.log("- Response Length:", response.response.length);
            console.log("- Tokens Used:", response.tokensUsed);
            console.log("- Model Used:", response.modelUsed);
            console.log("- Has Clinical Insights:", !!response.clinicalInsights);
            console.log("- Emergency Detected:", response.emergencyDetected);

            // Check if response contains patient-specific terms
            const responseText = response.response.toLowerCase();
            const patientSpecificTerms = [
              "diabetes",
              "metformin",
              "hypertension",
              "chronic",
              "medication",
              "prescription",
              "encounter",
              "diagnosis",
              "35",
              "year",
              "old",
              "patient",
            ];

            const foundTerms = patientSpecificTerms.filter((term) => responseText.includes(term.toLowerCase()));

            console.log("\n🎯 Patient-Specific Analysis:");
            console.log("- Terms Found:", foundTerms.length);
            console.log("- Found Terms:", foundTerms);
            console.log("- Appears Patient-Specific:", foundTerms.length > 2);

            if (foundTerms.length < 2) {
              console.log("\n❌ ISSUE: Response appears generic!");
              console.log("The AI is not using patient-specific data effectively.");
            } else {
              console.log("\n✅ SUCCESS: Response appears patient-specific!");
            }
          } else {
            console.log("\n❌ API Error or no response generated");
          }
        } catch (parseError) {
          console.log("Raw response:", data);
          console.log("Parse error:", parseError.message);
        }

        console.log("=".repeat(80));
      });
    });

    req.on("error", (error) => {
      console.error("❌ Request Error:", error.message);
      console.log("\n💡 Make sure the Next.js server is running on http://localhost:3001");
      console.log("💡 Run: npm run dev");
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error("❌ Test Error:", error);
  }
}

console.log("🚀 Starting Clinical Analysis API Test...");
console.log("💡 This test requires the Next.js server to be running.");
console.log("💡 Make sure you have run: npm run dev\n");

testClinicalAnalysisAPI();
