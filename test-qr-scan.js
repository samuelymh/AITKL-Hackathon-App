async function testQRScan() {
  const qrData = JSON.stringify({
    type: "health_access_request",
    digitalIdentifier: "TEST123456",
    version: "1.0",
    timestamp: new Date().toISOString(),
  });

  const requestBody = {
    scannedQRData: qrData,
    organizationId: "67906898dfd5d57d75323891", // Example organization ID
    requestingPractitionerId: "67906898dfd5d57d75323892", // Example practitioner ID
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

  try {
    console.log("Testing QR scan with data:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("http://localhost:3001/api/v1/authorizations/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Response body:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n✅ QR scan successful!");
      console.log("Grant ID:", result.data.grantId);

      // Now check if notification job was created
      console.log("\nChecking notification jobs...");
      setTimeout(async () => {
        try {
          // Connect to MongoDB and check notification_jobs collection
          const { MongoClient } = require("mongodb");
          const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare");
          await client.connect();

          const db = client.db();
          const jobs = await db.collection("notification_jobs").find({}).toArray();

          console.log("Total notification jobs found:", jobs.length);
          if (jobs.length > 0) {
            console.log("Latest job:", JSON.stringify(jobs[jobs.length - 1], null, 2));
          }

          await client.close();
        } catch (error) {
          console.error("Error checking notification jobs:", error);
        }
      }, 2000);
    } else {
      console.log("❌ QR scan failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testQRScan();
