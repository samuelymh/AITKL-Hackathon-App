#!/usr/bin/env node

/**
 * Test script to check authorization grant status updates
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function testAuthorizationGrantStatusUpdate() {
  try {
    console.log("🔍 Testing Authorization Grant Status Updates\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Check if we have any authorization grants
    const AuthorizationGrant = mongoose.model("AuthorizationGrant", new mongoose.Schema({}, { strict: false }));
    const grants = await AuthorizationGrant.find().sort({ createdAt: -1 }).limit(5);

    console.log(`📋 Found ${grants.length} authorization grant(s):`);

    grants.forEach((grant, index) => {
      console.log(`\n${index + 1}. Grant ID: ${grant._id}`);
      console.log(`   User ID: ${grant.userId}`);
      console.log(`   Organization: ${grant.organizationId}`);
      console.log(`   Status: ${grant.grantDetails?.status || "No status"}`);
      console.log(`   Created: ${grant.createdAt}`);
      console.log(`   Granted At: ${grant.grantDetails?.grantedAt || "Not granted"}`);
      console.log(`   Expires At: ${grant.grantDetails?.expiresAt || "No expiration"}`);
      console.log(`   Time Window: ${grant.grantDetails?.timeWindowHours || "Not set"} hours`);
    });

    // Check notification jobs for the same data
    const NotificationJob = mongoose.model("NotificationJob", new mongoose.Schema({}, { strict: false }));
    const notifications = await NotificationJob.find({ type: "AUTHORIZATION_REQUEST" })
      .sort({ scheduledAt: -1 })
      .limit(5);

    console.log(`\n📬 Found ${notifications.length} authorization request notification(s):`);

    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification ID: ${notification._id}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Status: ${notification.status}`);
      console.log(`   Grant ID in payload: ${notification.payload?.data?.grantId || "Not set"}`);
      console.log(`   Patient ID: ${notification.payload?.data?.patientId || "Not set"}`);
      console.log(`   Practitioner ID: ${notification.payload?.data?.requestingPractitionerId || "Not set"}`);
      console.log(`   Created: ${notification.scheduledAt}`);
    });

    // Test the authorization service
    console.log("\n🔧 Testing Authorization Service:");
    const { getAuthorizationGrantsForPatient } = require("../lib/services/authorization-service");

    if (grants.length > 0) {
      const sampleUserId = grants[0].userId;
      console.log(`   Testing with User ID: ${sampleUserId}`);

      try {
        const userGrants = await getAuthorizationGrantsForPatient(sampleUserId.toString());
        console.log(`   Found ${userGrants.length} grant(s) for this user`);

        if (userGrants.length > 0) {
          const sampleGrant = userGrants[0];
          console.log(`   Sample grant status: ${sampleGrant.status}`);
          console.log(`   Sample grant ID: ${sampleGrant.grantId}`);
        }
      } catch (serviceError) {
        console.error(`   Service error: ${serviceError.message}`);
      }
    }

    console.log("\n✅ Status check complete!");
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    console.log("\n🔐 Database connection closed");
    await mongoose.connection.close();
  }
}

testAuthorizationGrantStatusUpdate();
