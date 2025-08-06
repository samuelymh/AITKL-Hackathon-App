#!/usr/bin/enconst API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"; node

/**
 * Test QR Code Scan Notification Creation
 * Tests that scanning a QR code creates a notification job in the database
 *
 * Usage: node scripts/test-qr-notification.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-app";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function testQRNotification() {
  let mongoClient;

  try {
    console.log("\n🔍 Testing QR Code Notification Creation\n");

    // Connect to MongoDB first to check current state
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("✅ Connected to database");

    const db = mongoClient.db();
    const notificationJobsCollection = db.collection("notification_jobs");
    const authGrantsCollection = db.collection("authorization_grants");

    // Check initial state
    const initialJobCount = await notificationJobsCollection.countDocuments();
    console.log(`📊 Initial notification jobs count: ${initialJobCount}`);

    // Create test QR data using a real patient digital identifier
    const qrData = JSON.stringify({
      type: "health_access_request",
      digitalIdentifier: "HID_12d542e1-22e3-4a22-9504-3dd7e1fc8845", // Real patient from DB
      version: "1.0",
      timestamp: new Date().toISOString(),
    });

    const requestBody = {
      scannedQRData: qrData,
      organizationId: "689174dd20f0a5ae7c7ada8e", // Real organization ID from auth grant
      requestingPractitionerId: "6891b41c5f75f2f335d1a187", // Real practitioner ID from auth grant
      accessScope: {
        canViewMedicalHistory: true,
        canViewPrescriptions: true,
        canCreateEncounters: false,
        canViewAuditLogs: false,
      },
      timeWindowHours: 24,
      requestMetadata: {
        deviceInfo: {
          userAgent: "Test/1.0",
          screen: { width: 1920, height: 1080 },
        },
      },
    };

    console.log("🎯 Simulating QR code scan...");
    console.log(`   Digital ID: ${JSON.parse(qrData).digitalIdentifier}`);
    console.log(`   Organization: ${requestBody.organizationId}`);
    console.log(`   Practitioner: ${requestBody.requestingPractitionerId}`);

    // Make API request
    const response = await fetch(`${API_BASE_URL}/api/v1/authorizations/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ API request failed:");
      console.log("   Response:", errorText);
      return;
    }

    const result = await response.json();
    console.log("✅ API request successful!");

    if (result.success && result.data?.grantId) {
      console.log(`   Grant ID: ${result.data.grantId}`);

      // Wait a moment for async operations to complete
      console.log("⏳ Waiting for notification job creation...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if authorization grant was created
      const { ObjectId } = require("mongodb");
      const grant = await authGrantsCollection.findOne({
        _id: new ObjectId(result.data.grantId),
      });

      if (grant) {
        console.log("✅ Authorization grant created successfully");
        console.log(`   Patient ID: ${grant.patientDigitalIdentifier}`);
        console.log(`   Status: ${grant.status}`);
      } else {
        console.log("❌ Authorization grant not found in database");
      }

      // Check if notification job was created
      const finalJobCount = await notificationJobsCollection.countDocuments();
      const newJobs = finalJobCount - initialJobCount;

      console.log(`📊 Final notification jobs count: ${finalJobCount}`);
      console.log(`📈 New jobs created: ${newJobs}`);

      if (newJobs > 0) {
        console.log("✅ Notification job(s) created successfully!");

        // Show the latest job
        const latestJob = await notificationJobsCollection.findOne({}, { sort: { createdAt: -1 } });

        if (latestJob) {
          console.log("📋 Latest notification job:");
          console.log(`   ID: ${latestJob._id}`);
          console.log(`   Type: ${latestJob.type}`);
          console.log(`   Recipient: ${latestJob.recipientId}`);
          console.log(`   Status: ${latestJob.status}`);
          console.log(`   Priority: ${latestJob.priority}`);
          console.log(`   Created: ${latestJob.createdAt}`);

          if (latestJob.payload?.title) {
            console.log(`   Title: ${latestJob.payload.title}`);
          }
          if (latestJob.payload?.body) {
            console.log(`   Body: ${latestJob.payload.body}`);
          }
        }
      } else {
        console.log("❌ No notification jobs were created");
        console.log("\n🔍 Troubleshooting steps:");
        console.log("1. Check if notification service is properly configured");
        console.log("2. Verify createAuthorizationRequestNotification is being called");
        console.log("3. Check server logs for any errors");
        console.log("4. Ensure notification_jobs collection exists and is writable");
      }
    } else {
      console.log("❌ API request succeeded but no grant ID returned");
      console.log("   Response:", JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Make sure the Next.js dev server is running:");
      console.log("   npm run dev");
    }
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log("🔐 Database connection closed");
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Test cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  testQRNotification().catch(console.error);
}

module.exports = { testQRNotification };
