#!/usr/bin/env node

/**
 * List Admin Users Script
 * Lists all admin users in the database
 *
 * Usage: node scripts/list-admin-users.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function listAdminUsers() {
  let client;

  try {
    console.log("\n👥 Admin Users List\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all admin users
    const adminUsers = await usersCollection
      .find({
        role: "admin",
      })
      .toArray();

    if (adminUsers.length === 0) {
      console.log("📭 No admin users found in the database");
      return;
    }

    console.log(`📊 Found ${adminUsers.length} admin user(s):\n`);

    adminUsers.forEach((admin, index) => {
      console.log(`${index + 1}. Admin User:`);
      console.log(`   - ID: ${admin._id}`);
      console.log(`   - Digital ID: ${admin.digitalIdentifier || "N/A"}`);
      console.log(`   - Email: ${admin.auth?.email || admin.personalInfo?.contact?.email || "N/A"}`);
      console.log(`   - Name: ${admin.personalInfo?.firstName || "N/A"} ${admin.personalInfo?.lastName || "N/A"}`);
      console.log(`   - Phone: ${admin.personalInfo?.contact?.phone || "N/A"}`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - Active: ${admin.metadata?.isActive !== false ? "Yes" : "No"}`);
      console.log(
        `   - Created: ${admin.metadata?.createdAt ? new Date(admin.metadata.createdAt).toISOString() : "N/A"}`
      );
      console.log(
        `   - Updated: ${admin.metadata?.updatedAt ? new Date(admin.metadata.updatedAt).toISOString() : "N/A"}`
      );
      console.log("");
    });

    // Also check for any users with admin-like roles or permissions
    const otherAdminLikeUsers = await usersCollection
      .find({
        $and: [
          { role: { $ne: "admin" } },
          {
            $or: [{ "auth.email": /admin/i }, { "personalInfo.contact.email": /admin/i }, { role: /admin/i }],
          },
        ],
      })
      .toArray();

    if (otherAdminLikeUsers.length > 0) {
      console.log(`⚠️ Found ${otherAdminLikeUsers.length} user(s) with admin-like properties but not admin role:\n`);

      otherAdminLikeUsers.forEach((user, index) => {
        console.log(`${index + 1}. User:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Email: ${user.auth?.email || user.personalInfo?.contact?.email || "N/A"}`);
        console.log(`   - Role: ${user.role}`);
        console.log("");
      });
    }
  } catch (error) {
    console.error("❌ Error listing admin users:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 List operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  listAdminUsers().catch(console.error);
}
