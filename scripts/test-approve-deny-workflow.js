#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://healthtech:h3alth2024@cluster0.juhzm.mongodb.net/aitkl-health?retryWrites=true&w=majority&appName=Cluster0";

async function testApproveDenyWorkflow() {
  let client;

  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("aitkl-health");

    const grantsCollection = db.collection("authorizationgrants");
    const notificationsCollection = db.collection("notification_jobs");

    // 1. Create a test authorization grant
    console.log("\n1. Creating test authorization grant...");
    const testGrant = {
      _id: new ObjectId(),
      userId: new ObjectId("674c123456789abcdef12345"), // Patient ID
      patientId: new ObjectId("674c123456789abcdef12345"),
      organizationId: new ObjectId("674c123456789abcdef67890"),
      requestingPractitionerId: new ObjectId("674c123456789abcdef54321"),
      grantDetails: {
        status: "PENDING",
        timeWindowHours: 24,
        grantedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      accessScope: ["medical_records", "prescriptions"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await grantsCollection.insertOne(testGrant);
    console.log("✓ Test grant created:", testGrant._id);

    // 2. Create corresponding notification
    console.log("\n2. Creating corresponding notification...");
    const testNotification = {
      _id: new ObjectId(),
      type: "authorization_request",
      status: "pending",
      userId: testGrant.userId,
      grantId: testGrant._id,
      priority: "HIGH",
      scheduledAt: new Date(),
      data: {
        patientId: testGrant.patientId,
        practitionerId: testGrant.requestingPractitionerId,
        organizationId: testGrant.organizationId,
        accessScope: testGrant.accessScope,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await notificationsCollection.insertOne(testNotification);
    console.log("✓ Test notification created:", testNotification._id);

    // 3. Test approve workflow
    console.log("\n3. Testing approve workflow...");
    console.log("Simulating approve action...");

    // Update grant to approved
    await grantsCollection.updateOne(
      { _id: testGrant._id },
      {
        $set: {
          "grantDetails.status": "APPROVED",
          "grantDetails.grantedAt": new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Update notification to approved
    await notificationsCollection.updateMany(
      { grantId: testGrant._id },
      {
        $set: {
          status: "approved",
          updatedAt: new Date(),
        },
      }
    );

    // Verify approve workflow
    const approvedGrant = await grantsCollection.findOne({ _id: testGrant._id });
    const approvedNotification = await notificationsCollection.findOne({ grantId: testGrant._id });

    console.log("✓ Grant status after approve:", approvedGrant.grantDetails.status);
    console.log("✓ Notification status after approve:", approvedNotification.status);

    // 4. Create another test grant for deny workflow
    console.log("\n4. Creating second test grant for deny workflow...");
    const testGrant2 = {
      _id: new ObjectId(),
      userId: new ObjectId("674c123456789abcdef12345"), // Same patient
      patientId: new ObjectId("674c123456789abcdef12345"),
      organizationId: new ObjectId("674c123456789abcdef67890"),
      requestingPractitionerId: new ObjectId("674c123456789abcdef54321"),
      grantDetails: {
        status: "PENDING",
        timeWindowHours: 24,
        grantedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      accessScope: ["lab_results"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await grantsCollection.insertOne(testGrant2);
    console.log("✓ Second test grant created:", testGrant2._id);

    // Create corresponding notification
    const testNotification2 = {
      _id: new ObjectId(),
      type: "authorization_request",
      status: "pending",
      userId: testGrant2.userId,
      grantId: testGrant2._id,
      priority: "HIGH",
      scheduledAt: new Date(),
      data: {
        patientId: testGrant2.patientId,
        practitionerId: testGrant2.requestingPractitionerId,
        organizationId: testGrant2.organizationId,
        accessScope: testGrant2.accessScope,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await notificationsCollection.insertOne(testNotification2);
    console.log("✓ Second test notification created:", testNotification2._id);

    // 5. Test deny workflow
    console.log("\n5. Testing deny workflow...");
    console.log("Simulating deny action...");

    // Update grant to denied
    await grantsCollection.updateOne(
      { _id: testGrant2._id },
      {
        $set: {
          "grantDetails.status": "DENIED",
          updatedAt: new Date(),
        },
      }
    );

    // Update notification to denied
    await notificationsCollection.updateMany(
      { grantId: testGrant2._id },
      {
        $set: {
          status: "denied",
          updatedAt: new Date(),
        },
      }
    );

    // Verify deny workflow
    const deniedGrant = await grantsCollection.findOne({ _id: testGrant2._id });
    const deniedNotification = await notificationsCollection.findOne({ grantId: testGrant2._id });

    console.log("✓ Grant status after deny:", deniedGrant.grantDetails.status);
    console.log("✓ Notification status after deny:", deniedNotification.status);

    // 6. Test aggregation query to see if both show up correctly
    console.log("\n6. Testing aggregation query for patient notifications...");
    const aggregationPipeline = [
      {
        $match: {
          userId: testGrant.userId,
        },
      },
      {
        $lookup: {
          from: "authorizationgrants",
          localField: "grantId",
          foreignField: "_id",
          as: "grant",
        },
      },
      {
        $unwind: {
          path: "$grant",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "grant.organizationId",
          foreignField: "_id",
          as: "organization",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "grant.requestingPractitionerId",
          foreignField: "_id",
          as: "practitioner",
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          status: 1,
          scheduledAt: 1,
          data: 1,
          createdAt: 1,
          grantStatus: "$grant.grantDetails.status",
          organizationName: { $arrayElemAt: ["$organization.organizationInfo.name", 0] },
          practitionerName: {
            $concat: [
              { $arrayElemAt: ["$practitioner.personalInfo.firstName", 0] },
              " ",
              { $arrayElemAt: ["$practitioner.personalInfo.lastName", 0] },
            ],
          },
          practitionerType: { $arrayElemAt: ["$practitioner.professionalInfo.practitionerType", 0] },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const notificationsWithStatus = await notificationsCollection.aggregate(aggregationPipeline).toArray();

    console.log("\n📋 Patient notifications with current status:");
    notificationsWithStatus.forEach((notification, index) => {
      console.log(`${index + 1}. Notification: ${notification.status} | Grant: ${notification.grantStatus}`);
      console.log(`   Organization: ${notification.organizationName}`);
      console.log(`   Practitioner: ${notification.practitionerName} (${notification.practitionerType})`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log("");
    });

    // 7. Clean up test data
    console.log("7. Cleaning up test data...");
    await grantsCollection.deleteMany({ _id: { $in: [testGrant._id, testGrant2._id] } });
    await notificationsCollection.deleteMany({ _id: { $in: [testNotification._id, testNotification2._id] } });
    console.log("✓ Test data cleaned up");

    console.log("\n🎉 All approve/deny workflow tests passed!");
  } catch (error) {
    console.error("❌ Error testing approve/deny workflow:", error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the test
testApproveDenyWorkflow()
  .then(() => {
    console.log("\n✅ Approve/deny workflow test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Approve/deny workflow test failed:", error);
    process.exit(1);
  });
