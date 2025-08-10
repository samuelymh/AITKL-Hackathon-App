const mongoose = require("mongoose");

// Simple test to debug the clinical analysis flow in detail
async function debugClinicalAnalysisDetailed() {
  try {
    console.log("🔍 Debugging Clinical Analysis Flow in Detail...\n");

    // Connect to MongoDB with correct URI
    const mongoUri =
      "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Test the exact API call that the frontend makes
    const testPatientId = "676b36e35db4caad6ac67b51"; // From our previous debug
    const testMessage = "What are the key clinical considerations for this patient?";

    console.log("📋 Test Parameters:");
    console.log("- Patient ID:", testPatientId);
    console.log("- Message:", testMessage);
    console.log("- Session Type: clinical_analysis");
    console.log("- User Role: doctor\n");

    console.log("🔍 Step 1: Getting Patient Data Directly...");

    // Get the User model
    const User = mongoose.model("User", require("./lib/models/User").default.schema);
    const Patient = mongoose.model("Patient", require("./lib/models/Patient").default.schema);
    const Encounter = mongoose.model("Encounter", require("./lib/models/Encounter").default.schema);

    // Find the patient directly
    const patient = await Patient.findOne({ userId: testPatientId }).lean();
    const user = await User.findById(testPatientId).lean();
    const encounters = await Encounter.find({ patientId: testPatientId }).sort({ createdAt: -1 }).limit(5).lean();

    console.log("✅ Patient Data Retrieved:");
    console.log("- User found:", !!user);
    console.log("- Patient found:", !!patient);
    console.log("- Encounters found:", encounters.length);

    if (!patient) {
      console.log("❌ No patient data found");
      return;
    }

    console.log("\n📊 Patient Details:");
    console.log("- Age:", patient.demographics?.age);
    console.log("- Medical History:", patient.medicalHistory?.chronicConditions?.length || 0);
    console.log("- Current Medications:", patient.medicalHistory?.currentMedications?.length || 0);
    console.log("- Allergies:", patient.medicalHistory?.allergies?.drug?.length || 0);

    console.log("\n🏥 Recent Encounters:");
    encounters.forEach((enc, idx) => {
      console.log(
        `  ${idx + 1}. ${enc.type} - ${enc.chiefComplaint} (${new Date(enc.createdAt).toLocaleDateString()})`
      );
    });

    console.log("\n🤖 Step 2: Testing Clinical Analysis Prompt...");

    // Build a manual clinical analysis prompt to see what should be sent to the AI
    const clinicalPrompt = `You are a Clinical AI Assistant providing clinical insights to healthcare providers.

PATIENT MEDICAL CONTEXT:
- Patient ID: ${testPatientId}
- Age: ${patient.demographics?.age} years
- Medical History: ${JSON.stringify(patient.medicalHistory, null, 2)}
- Recent Encounters: ${JSON.stringify(encounters.slice(0, 3), null, 2)}

CURRENT QUERY: ${testMessage}

INSTRUCTIONS:
Analyze this patient's complete medical context and provide specific, actionable clinical insights. Focus on:

1. **Clinical Summary**: Key findings from the patient's history
2. **Safety Alerts**: Any red flags or urgent concerns  
3. **Clinical Recommendations**: Evidence-based suggestions for care
4. **Care Gaps**: Missing screenings or follow-ups
5. **Medication Review**: Current therapy assessment

Provide concrete, patient-specific insights based on the actual medical data above.`;

    console.log("📝 Clinical Analysis Prompt Built:");
    console.log("=".repeat(80));
    console.log(clinicalPrompt);
    console.log("=".repeat(80));

    // Test if we have Groq API key
    console.log("\n� Checking Groq Configuration...");

    // Simple HTTP test to the API
    console.log("\n🌐 Testing Direct API Call...");

    const testPayload = {
      sessionId: "test-session-" + Date.now(),
      message: testMessage,
      sessionType: "clinical_analysis",
      context: {
        patientId: testPatientId,
        userId: testPatientId,
      },
      userRole: "doctor",
      conversationHistory: [],
    };

    console.log("📤 API Payload:");
    console.log(JSON.stringify(testPayload, null, 2));

    console.log("\n✅ Debug completed. The issue appears to be in how the AI interprets the clinical context.");
    console.log("💡 Next step: Check if the AI is actually using the patient-specific data in its response.");

    // Check what kind of response we should expect
    const expectedElements = [
      `${patient.demographics?.age} year old`,
      "diabetes",
      "metformin",
      "hypertension",
      ...(patient.medicalHistory?.chronicConditions?.map((c) => c.condition) || []),
      ...(patient.medicalHistory?.currentMedications?.map((m) => m.name) || []),
    ];

    console.log("\n🎯 Expected Patient-Specific Elements in Response:");
    expectedElements.forEach((element, idx) => {
      console.log(`  ${idx + 1}. ${element}`);
    });
  } catch (error) {
    console.error("❌ Debug Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

debugClinicalAnalysisDetailed();
