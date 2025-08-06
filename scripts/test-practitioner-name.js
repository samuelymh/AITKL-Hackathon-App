#!/usr/bin/env node

/**
 * Test script to verify practitioner name is correctly included in notifications
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testPractitionerNameMapping() {
  try {
    console.log('🔍 Testing Practitioner Name Mapping\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import the notification service function
    const { getPatientNotifications } = require('../lib/services/notification-service');
    
    // Get some sample patient ID from notifications
    const NotificationJob = mongoose.model('NotificationJob', new mongoose.Schema({}, { strict: false }));
    const sampleNotification = await NotificationJob.findOne({ type: "AUTHORIZATION_REQUEST" });
    
    if (!sampleNotification) {
      console.log('⚠️  No notifications found. Make sure to run the QR scan test first.');
      return;
    }

    const patientId = sampleNotification.payload?.data?.patientId;
    if (!patientId) {
      console.log('⚠️  No patient ID found in notification payload.');
      return;
    }

    console.log(`📋 Testing notifications for patient: ${patientId}`);
    
    // Test the actual service function
    const notifications = await getPatientNotifications(patientId, 5);
    
    console.log(`\n📋 Found ${notifications.length} notification(s):`);
    
    notifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification ID: ${notification.id}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Title: ${notification.title || 'N/A'}`);
      console.log(`   Practitioner Name: ${notification.practitionerName || 'N/A'}`);
      console.log(`   Status: ${notification.status}`);
    });

    if (notifications.length === 0) {
      console.log('\n⚠️  No notifications found for this patient.');
    } else {
      const hasValidNames = notifications.some(n => n.practitionerName && n.practitionerName !== 'Unknown Practitioner');
      if (hasValidNames) {
        console.log('\n✅ Successfully retrieving practitioner names!');
      } else {
        console.log('\n⚠️  All practitioner names are showing as "Unknown Practitioner"');
      }
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    console.log('\n🔐 Database connection closed');
    await mongoose.connection.close();
  }
}

testPractitionerNameMapping();
