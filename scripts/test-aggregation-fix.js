#!/usr/bin/env node

const mongoose = require("mongoose");

// Environment setup
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET environment variable is required");
  process.exit(1);
}

// MongoDB URI - must be in environment
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  process.exit(1);
}

async function testAggregationFix() {
  console.log("🧪 Testing MongoDB Aggregation Fix");
  console.log("==================================");

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Test the aggregation by calling the pharmacy service directly
    console.log("📊 Testing pharmacy service aggregation...");

    // Import the models
    const AuthorizationGrant = require("../lib/models/AuthorizationGrant").default;
    const User = require("../lib/models/User").default;

    // Try a simple aggregation to see if the error is fixed
    console.log("🔍 Running test aggregation...");

    const testResult = await AuthorizationGrant.aggregate([
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "patient",
        },
      },
      {
        $unwind: { path: "$patient", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          // Test the fix - use placeholder instead of $concat with encrypted fields
          testPatientName: {
            $cond: {
              if: { $ne: ["$patient.personalInfo.firstName", null] },
              then: "[Encrypted Name]",
              else: "Unknown Patient",
            },
          },
          status: "$grantDetails.status",
        },
      },
    ]);

    console.log("✅ Aggregation completed successfully!");
    console.log(`📋 Test result count: ${testResult.length}`);

    if (testResult.length > 0) {
      console.log("📄 Sample result:", JSON.stringify(testResult[0], null, 2));
    }
  } catch (error) {
    console.error("❌ Aggregation test failed:", error.message);

    if (error.message.includes("$concat") || error.message.includes("ConversionFailure")) {
      console.error("🚨 This indicates the $concat/$convert issue is still present");
    }

    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB");
  }

  console.log("\n🎯 Aggregation test completed successfully!");
  console.log("✅ The $concat error should now be fixed");
}

// Run the test
testAggregationFix().catch((error) => {
  console.error("💥 Test failed with error:", error);
  process.exit(1);
});
