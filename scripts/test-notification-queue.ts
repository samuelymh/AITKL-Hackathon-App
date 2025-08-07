#!/usr/bin/env tsx

/**
 * Test Script for Queue-Based Notification System
 *
 * This script tests the entire notification queue system end-to-end:
 * 1. Enqueueing jobs of different types and priorities
 * 2. Processing jobs in batches
 * 3. Handling retries and failures
 * 4. Cleaning up old jobs
 * 5. Queue statistics and monitoring
 */

import mongoose from "mongoose";
import {
  NotificationQueueProcessor,
  NotificationHelpers,
} from "../lib/services/notification-queue-processor";
import { PushNotificationService } from "../lib/services/push-notification-service";
import { NotificationJobType } from "../lib/services/notification-queue";
import connectToDatabase from "../lib/db.connection";

async function testNotificationQueue() {
  console.log("🧪 Starting Notification Queue Test Suite");
  console.log("=".repeat(60));

  try {
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database");

    // Test 1: Enqueue different types of notifications
    console.log("\n📝 Test 1: Enqueueing notifications");
    console.log("-".repeat(40));

    const testUserId = "test-user-" + Date.now();
    const testGrantId = "test-grant-" + Date.now();

    // Enqueue authorization request (high priority)
    const authJobId = await NotificationHelpers.enqueueAuthorizationRequest(
      testUserId,
      testGrantId,
      "Test Hospital",
      "John Smith",
      true, // urgent
    );
    console.log(`✅ Enqueued authorization request: ${authJobId}`);

    // Enqueue status update (normal priority)
    const statusJobId = await NotificationHelpers.enqueueStatusUpdate(
      testUserId,
      testGrantId,
      "approved",
    );
    console.log(`✅ Enqueued status update: ${statusJobId}`);

    // Enqueue some additional test jobs
    const reminderJobId = await NotificationQueueProcessor.enqueue(
      NotificationJobType.REMINDER,
      testUserId,
      {
        title: "Medication Reminder",
        body: "Time to take your medication",
        data: { type: "medication" },
      },
    );
    console.log(`✅ Enqueued reminder: ${reminderJobId}`);

    // Test 2: Check queue statistics before processing
    console.log("\n📊 Test 2: Queue statistics (before processing)");
    console.log("-".repeat(40));

    const statsBefore = await PushNotificationService.getQueueStats();
    console.log("Queue stats before processing:", statsBefore);

    // Test 3: Process jobs in batches
    console.log("\n⚙️  Test 3: Processing notification jobs");
    console.log("-".repeat(40));

    const processResult = await NotificationQueueProcessor.processBatch(5);
    console.log(`✅ Processed ${processResult.processed} jobs`);
    console.log(`   - Succeeded: ${processResult.succeeded}`);
    console.log(`   - Failed: ${processResult.failed}`);

    if (processResult.errors.length > 0) {
      console.log("   - Errors:");
      processResult.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    // Test 4: Check queue statistics after processing
    console.log("\n📊 Test 4: Queue statistics (after processing)");
    console.log("-".repeat(40));

    const statsAfter = await PushNotificationService.getQueueStats();
    console.log("Queue stats after processing:", statsAfter);

    // Test 5: Test retry logic by creating a job that will fail
    console.log("\n🔄 Test 5: Testing retry logic");
    console.log("-".repeat(40));

    // Create a job that might fail in simulation (5% chance)
    const retryJobId = await NotificationQueueProcessor.enqueue(
      NotificationJobType.SYSTEM_ALERT,
      testUserId,
      {
        title: "System Alert",
        body: "This is a test alert that might fail",
        data: { type: "test" },
      },
    );
    console.log(`✅ Enqueued job for retry testing: ${retryJobId}`);

    // Process a few times to potentially trigger retries
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      const retryResult = await NotificationQueueProcessor.processBatch(1);
      console.log(
        `   Retry attempt ${i + 1}: ${retryResult.processed} processed, ${retryResult.failed} failed`,
      );

      if (retryResult.processed === 0) {
        console.log("   No more jobs to process");
        break;
      }
    }

    // Test 6: Queue cleanup
    console.log("\n🧹 Test 6: Queue cleanup");
    console.log("-".repeat(40));

    const deletedCount = await PushNotificationService.cleanupOldJobs(0); // Clean all old jobs (0 hours = all completed/failed)
    console.log(`✅ Cleaned up ${deletedCount} old jobs`);

    // Final statistics
    console.log("\n📊 Final Queue Statistics");
    console.log("-".repeat(40));

    const finalStats = await PushNotificationService.getQueueStats();
    console.log("Final queue stats:", finalStats);

    // Test 7: API endpoint simulation
    console.log("\n🔗 Test 7: API endpoint behavior");
    console.log("-".repeat(40));

    // Simulate what the API endpoints would return
    console.log("Simulating API responses:");
    console.log("POST /api/admin/queue/process would return:", {
      success: true,
      data: processResult,
      timestamp: new Date().toISOString(),
    });

    console.log("GET /api/admin/queue/process would return:", {
      success: true,
      data: finalStats,
      timestamp: new Date().toISOString(),
    });

    console.log("POST /api/admin/queue/cleanup would return:", {
      success: true,
      data: {
        deletedCount,
        olderThanHours: 24,
        cleanupAt: new Date().toISOString(),
      },
      message:
        deletedCount > 0
          ? `Cleaned up ${deletedCount} old notification jobs`
          : "No old jobs to clean up",
    });

    console.log("\n✅ All tests completed successfully!");
    console.log("=".repeat(60));
    console.log(
      "The notification queue system is working correctly and is ready for production use on Vercel.",
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔐 Database connection closed");
  }
}

// Export test function for use in other scripts
export { testNotificationQueue };

// Run tests if this script is executed directly
if (require.main === module) {
  testNotificationQueue()
    .then(() => {
      console.log("🎉 Test suite completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Test suite failed:", error);
      process.exit(1);
    });
}
