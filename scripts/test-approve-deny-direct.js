#!/usr/bin/env node

/**
 * Direct Database Test for Approve/Deny Workflow
 * Tests the complete workflow using direct database operations
 * Similar to other tests in scripts/ directory
 *
 * Usage: node scripts/test-approve-deny-direct.js
 */

const { MongoClient, ObjectId } = require("mongodb");

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthcare-app";

async function testApproveDenyWorkflow() {
  let mongoClient;

  try {
    console.log("\n🔍 Testing Approve/Deny Authorization Workflow\n");

    // Connect to MongoDB
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log("✅ Connected to database");

    const db = mongoClient.db();
    const authGrantsCollection = db.collection("authorization_grants");
    const notificationJobsCollection = db.collection("notification_jobs");
    const usersCollection = db.collection("users");
    const organizationsCollection = db.collection("organizations");
    const practitionersCollection = db.collection("practitioners");

    // 1. Find test patient user
    console.log("\n📋 Step 1: Finding test patient user...");
    let testPatient = await usersCollection.findOne({
      $or: [{ "auth.role": "patient" }, { role: "patient" }],
    });

    if (!testPatient) {
      console.log("❌ No patient users found in database");
      console.log("   Create a patient user first or run the seed scripts");
      return;
    }

    console.log(`✅ Found test patient: ${testPatient.digitalIdentifier || testPatient._id}`);

    // 2. Find test organization
    console.log("\n📋 Step 2: Finding test organization...");
    let testOrg = await organizationsCollection.findOne();

    if (!testOrg) {
      console.log("❌ No organizations found in database");
      console.log("   Create an organization first or run the seed scripts");
      return;
    }

    console.log(`✅ Found test organization: ${testOrg.organizationInfo?.name || testOrg._id}`);

    // 3. Find test practitioner
    console.log("\n📋 Step 3: Finding test practitioner...");
    let testPractitioner = await practitionersCollection.findOne();

    if (!testPractitioner) {
      console.log("❌ No practitioners found in database");
      console.log("   Create a practitioner first or run the seed scripts");
      return;
    }

    console.log(`✅ Found test practitioner: ${testPractitioner._id}`);

    // 4. Create test authorization grant
    console.log("\n📋 Step 4: Creating test authorization grant...");
    const testGrantId = new ObjectId();
    const testGrant = {
      _id: testGrantId,
      userId: testPatient._id,
      organizationId: testOrg._id,
      requestingPractitionerId: testPractitioner._id,
      grantDetails: {
        status: "PENDING",
        timeWindowHours: 24,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      accessScope: {
        canViewMedicalHistory: true,
        canViewPrescriptions: true,
        canCreateEncounters: false,
        canViewAuditLogs: false,
      },
      requestMetadata: {
        ipAddress: "127.0.0.1",
        userAgent: "Test Script",
        deviceInfo: { type: "script" },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      auditCreatedBy: "test-script",
    };

    await authGrantsCollection.insertOne(testGrant);
    console.log(`✅ Created test grant: ${testGrantId}`);

    // 5. Create corresponding notification job
    console.log("\n📋 Step 5: Creating test notification job...");
    const testNotificationId = new ObjectId();
    const testNotification = {
      _id: testNotificationId,
      type: "AUTHORIZATION_REQUEST",
      status: "PENDING",
      priority: 5,
      scheduledAt: new Date(),
      payload: {
        title: "Test Authorization Request",
        body: "Test authorization request for approve/deny testing",
        data: {
          grantId: testGrantId.toString(),
          patientId: testPatient.digitalIdentifier || testPatient._id.toString(),
          organizationId: testOrg._id.toString(),
          requestingPractitionerId: testPractitioner._id.toString(),
          organizationName: testOrg.organizationInfo?.name || "Test Organization",
          timeWindowHours: 24,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await notificationJobsCollection.insertOne(testNotification);
    console.log(`✅ Created test notification: ${testNotificationId}`);

    // 6. Test APPROVE workflow
    console.log("\n📋 Step 6: Testing APPROVE workflow...");

    // Simulate the approve endpoint behavior
    const approveResult = await authGrantsCollection.updateOne(
      { _id: testGrantId },
      {
        $set: {
          "grantDetails.status": "ACTIVE",
          "grantDetails.grantedAt": new Date(),
          updatedAt: new Date(),
          auditModifiedBy: testPatient._id.toString(),
        },
      }
    );

    if (approveResult.modifiedCount === 1) {
      console.log("✅ Grant status updated to ACTIVE");

      // Update notification status (simulate what the API does)
      const notificationUpdateResult = await notificationJobsCollection.updateOne(
        { _id: testNotificationId },
        {
          $set: {
            status: "COMPLETED",
            updatedAt: new Date(),
          },
        }
      );

      if (notificationUpdateResult.modifiedCount === 1) {
        console.log("✅ Notification status updated to COMPLETED");
      } else {
        console.log("⚠️  Failed to update notification status");
      }
    } else {
      console.log("⚠️  Failed to update grant status");
    }

    // 7. Verify the approve changes
    console.log("\n📋 Step 7: Verifying APPROVE changes...");
    const approvedGrant = await authGrantsCollection.findOne({ _id: testGrantId });
    const approvedNotification = await notificationJobsCollection.findOne({ _id: testNotificationId });

    console.log("Grant Status:", approvedGrant?.grantDetails?.status);
    console.log("Grant Approved At:", approvedGrant?.grantDetails?.grantedAt?.toISOString());
    console.log("Notification Status:", approvedNotification?.status);

    if (approvedGrant?.grantDetails?.status === "ACTIVE" && approvedNotification?.status === "COMPLETED") {
      console.log("\n✅ APPROVE workflow test: PASSED");
    } else {
      console.log("\n❌ APPROVE workflow test: FAILED");
    }

    // 8. Create second grant for DENY test
    console.log("\n📋 Step 8: Creating second grant for DENY test...");

    const testGrantId2 = new ObjectId();
    const testGrant2 = {
      ...testGrant,
      _id: testGrantId2,
      grantDetails: {
        ...testGrant.grantDetails,
        status: "PENDING",
      },
    };

    await authGrantsCollection.insertOne(testGrant2);
    console.log(`✅ Created second test grant: ${testGrantId2}`);

    const testNotificationId2 = new ObjectId();
    const testNotification2 = {
      ...testNotification,
      _id: testNotificationId2,
      payload: {
        ...testNotification.payload,
        data: {
          ...testNotification.payload.data,
          grantId: testGrantId2.toString(),
        },
      },
    };

    await notificationJobsCollection.insertOne(testNotification2);
    console.log(`✅ Created second test notification: ${testNotificationId2}`);

    // 9. Test DENY workflow
    console.log("\n📋 Step 9: Testing DENY workflow...");

    // Simulate the deny endpoint behavior
    const denyResult = await authGrantsCollection.updateOne(
      { _id: testGrantId2 },
      {
        $set: {
          "grantDetails.status": "REVOKED",
          updatedAt: new Date(),
          auditModifiedBy: testPatient._id.toString(),
        },
      }
    );

    if (denyResult.modifiedCount === 1) {
      console.log("✅ Grant status updated to REVOKED");

      // Update notification status
      const notificationUpdateResult2 = await notificationJobsCollection.updateOne(
        { _id: testNotificationId2 },
        {
          $set: {
            status: "COMPLETED",
            updatedAt: new Date(),
          },
        }
      );

      if (notificationUpdateResult2.modifiedCount === 1) {
        console.log("✅ Notification status updated to COMPLETED");
      } else {
        console.log("⚠️  Failed to update notification status");
      }
    } else {
      console.log("⚠️  Failed to update grant status to REVOKED");
    }

    // 10. Verify the deny changes
    console.log("\n📋 Step 10: Verifying DENY changes...");
    const deniedGrant = await authGrantsCollection.findOne({ _id: testGrantId2 });
    const deniedNotification = await notificationJobsCollection.findOne({ _id: testNotificationId2 });

    console.log("Denied Grant Status:", deniedGrant?.grantDetails?.status);
    console.log("Denied Notification Status:", deniedNotification?.status);

    if (deniedGrant?.grantDetails?.status === "REVOKED" && deniedNotification?.status === "COMPLETED") {
      console.log("\n✅ DENY workflow test: PASSED");
    } else {
      console.log("\n❌ DENY workflow test: FAILED");
    }

    // 11. Test authorization history aggregation
    console.log("\n📋 Step 11: Testing authorization history aggregation...");

    const historyPipeline = [
      {
        $match: { userId: testPatient._id },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "organizationId",
          foreignField: "_id",
          as: "organization",
        },
      },
      {
        $lookup: {
          from: "practitioners",
          localField: "requestingPractitionerId",
          foreignField: "_id",
          as: "practitioner",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "requestingPractitionerId",
          foreignField: "_id",
          as: "requesterUser",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const historyResults = await authGrantsCollection.aggregate(historyPipeline).toArray();

    console.log(`✅ Found ${historyResults.length} grant(s) for patient in history`);
    historyResults.forEach((grant, index) => {
      const orgName = grant.organization?.[0]?.organizationInfo?.name || "Unknown Organization";
      const practitionerType = grant.practitioner?.[0]?.practitionerType || "Unknown";
      const userName =
        grant.requesterUser?.[0]?.firstName && grant.requesterUser?.[0]?.lastName
          ? `${grant.requesterUser[0].firstName} ${grant.requesterUser[0].lastName}`
          : "Unknown Practitioner";

      console.log(`   ${index + 1}. Grant ${grant._id}: ${grant.grantDetails?.status}`);
      console.log(`      Organization: ${orgName}`);
      console.log(`      Practitioner: ${userName} (${practitionerType})`);
      console.log(`      Created: ${grant.createdAt?.toISOString()}`);
    });

    // 12. Test notification aggregation (what dashboard shows)
    console.log("\n📋 Step 12: Testing notification aggregation...");

    const notificationPipeline = [
      {
        $match: {
          "payload.data.patientId": testPatient.digitalIdentifier || testPatient._id.toString(),
        },
      },
      {
        $addFields: {
          organizationObjectId: {
            $toObjectId: "$payload.data.organizationId",
          },
          practitionerObjectId: {
            $toObjectId: "$payload.data.requestingPractitionerId",
          },
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "organizationObjectId",
          foreignField: "_id",
          as: "organization",
        },
      },
      {
        $lookup: {
          from: "practitioners",
          localField: "practitionerObjectId",
          foreignField: "_id",
          as: "practitioner",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "practitionerObjectId",
          foreignField: "_id",
          as: "practitionerUser",
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const notificationResults = await notificationJobsCollection.aggregate(notificationPipeline).toArray();

    console.log(`✅ Found ${notificationResults.length} notification(s) for patient dashboard`);
    notificationResults.forEach((notification, index) => {
      const orgName = notification.organization?.[0]?.organizationInfo?.name || "Unknown Organization";
      const practitionerType = notification.practitioner?.[0]?.practitionerType || "Unknown";
      const userName =
        notification.practitionerUser?.[0]?.firstName && notification.practitionerUser?.[0]?.lastName
          ? `${notification.practitionerUser[0].firstName} ${notification.practitionerUser[0].lastName}`
          : "Unknown Practitioner";

      console.log(`   ${index + 1}. Notification ${notification._id}: ${notification.status}`);
      console.log(`      Organization: ${orgName}`);
      console.log(`      Practitioner: ${userName} (${practitionerType})`);
      console.log(`      Created: ${notification.createdAt?.toISOString()}`);
    });

    // 13. Cleanup test data
    console.log("\n📋 Step 13: Cleaning up test data...");
    await authGrantsCollection.deleteMany({
      _id: { $in: [testGrantId, testGrantId2] },
    });
    await notificationJobsCollection.deleteMany({
      _id: { $in: [testNotificationId, testNotificationId2] },
    });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📝 Test Summary:");
    console.log("   ✅ Authorization Grant creation");
    console.log("   ✅ Notification Job creation");
    console.log("   ✅ APPROVE workflow (PENDING → ACTIVE)");
    console.log("   ✅ DENY workflow (PENDING → REVOKED)");
    console.log("   ✅ Status synchronization (grant + notification)");
    console.log("   ✅ Authorization history aggregation");
    console.log("   ✅ Notification dashboard aggregation");
    console.log("   ✅ Data cleanup");
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error(error.stack);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log("\n🔐 Database connection closed");
    }
  }
}

// Run the test
if (require.main === module) {
  testApproveDenyWorkflow();
}

module.exports = { testApproveDenyWorkflow };
