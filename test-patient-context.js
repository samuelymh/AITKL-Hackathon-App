/**
 * Test script to verify patient context service is working
 */
const mongoose = require("mongoose");

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-app");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

// Test patient context gathering
async function testPatientContext() {
  console.log("🧪 Testing Patient Context Service...");

  try {
    // Import the service
    const { PatientContextService } = require("./lib/services/patient-context-service.ts");

    // Try to get a list of users first
    const User = require("./lib/models/User");
    const users = await User.find({ role: "patient" }).limit(5);

    console.log(`📊 Found ${users.length} patients in database`);

    if (users.length > 0) {
      const testUserId = users[0]._id.toString();
      console.log(`🔍 Testing with user ID: ${testUserId}`);

      const context = await PatientContextService.gatherPatientContext(testUserId);

      if (context) {
        console.log("✅ Patient context gathered successfully:", {
          age: context.demographics.age,
          chronicConditions: context.chronicConditions.length,
          medications: context.currentMedications.length,
          encounters: context.recentEncounters.length,
          allergies: [...context.allergies.drug, ...context.allergies.food].length,
          riskFactors: context.riskFactors.length,
        });
      } else {
        console.log("⚠️ No patient context returned");
      }
    } else {
      console.log("⚠️ No patients found in database");
    }
  } catch (error) {
    console.error("❌ Error testing patient context:", error);
  }
}

async function main() {
  await connectToDatabase();
  await testPatientContext();
  process.exit(0);
}

main();
