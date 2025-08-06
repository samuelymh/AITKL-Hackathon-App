const mongoose = require("mongoose");

// Quick test script to verify notification job creation
async function testNotificationJob() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-app");
    console.log("Connected to MongoDB");

    // Import the service
    const { createAuthorizationRequestNotification } = require("./lib/services/notification-service.ts");

    // Test data
    const testPatientId = "507f1f77bcf86cd799439011"; // Valid ObjectId
    const testGrantId = "507f1f77bcf86cd799439012";
    const testOrganization = {
      _id: "507f1f77bcf86cd799439013",
      organizationInfo: {
        name: "Test Hospital",
      },
    };
    const testPractitionerId = "507f1f77bcf86cd799439014";
    const testScope = ["canViewMedicalHistory", "canViewPrescriptions"];
    const testTimeWindow = 2;

    console.log("Creating test notification job...");

    await createAuthorizationRequestNotification(
      testPatientId,
      testGrantId,
      testOrganization,
      testPractitionerId,
      testScope,
      testTimeWindow
    );

    console.log("Test notification job created successfully!");

    // Check if it was saved
    const NotificationJob = require("./lib/services/notification-queue.ts").default;
    const jobs = await NotificationJob.find({ userId: testPatientId });
    console.log("Found notification jobs:", jobs.length);

    if (jobs.length > 0) {
      console.log("Latest job:", JSON.stringify(jobs[0], null, 2));
    }
  } catch (error) {
    console.error("Error testing notification job:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

testNotificationJob();
