#!/usr/bin/env node

/**
 * List All Users Script
 * Lists all users in the database to help find the pharmacist
 *
 * Usage: node scripts/list-all-users.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function listAllUsers() {
  let client;

  try {
    console.log("\n👥 All Users List\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all users
    const allUsers = await usersCollection.find({}).toArray();

    if (allUsers.length === 0) {
      console.log("📭 No users found in the database");
      return;
    }

    console.log(`📊 Found ${allUsers.length} user(s) total:\n`);

    // Group by role
    const usersByRole = {};
    allUsers.forEach((user) => {
      const role = user.role || "unknown";
      if (!usersByRole[role]) {
        usersByRole[role] = [];
      }
      usersByRole[role].push(user);
    });

    Object.keys(usersByRole).forEach((role) => {
      console.log(`\n📋 ${role.toUpperCase()} USERS (${usersByRole[role].length}):`);

      usersByRole[role].forEach((user, index) => {
        console.log(`\n${index + 1}. ${role.charAt(0).toUpperCase() + role.slice(1)} User:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Digital ID: ${user.digitalIdentifier || "N/A"}`);
        console.log(`   - Email: ${user.auth?.email || user.personalInfo?.contact?.email || user.email || "N/A"}`);
        console.log(`   - Name: ${user.personalInfo?.firstName || "N/A"} ${user.personalInfo?.lastName || "N/A"}`);
        console.log(`   - Phone: ${user.personalInfo?.contact?.phone || "N/A"}`);
        console.log(`   - Active: ${user.metadata?.isActive !== false ? "Yes" : "No"}`);
        console.log(`   - Password Set: ${!!(user.auth?.passwordHash || user.auth?.password) ? "Yes" : "No"}`);

        // Show dates
        const createdAt = user.metadata?.createdAt || user.auditCreatedDateTime;
        if (createdAt) {
          console.log(`   - Created: ${new Date(createdAt).toISOString()}`);
        }
      });
    });

    // Search specifically for pharmacy-related patterns
    console.log(`\n\n🔍 SEARCHING FOR PHARMACY-RELATED USERS:`);
    const pharmacyUsers = await usersCollection
      .find({
        $or: [
          { "auth.email": /pharm/i },
          { "personalInfo.contact.email": /pharm/i },
          { email: /pharm/i },
          { "personalInfo.firstName": /pharm/i },
          { "personalInfo.lastName": /pharm/i },
          { role: /pharm/i },
        ],
      })
      .toArray();

    if (pharmacyUsers.length > 0) {
      console.log(`\n📊 Found ${pharmacyUsers.length} user(s) with pharmacy-related info:`);
      pharmacyUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. User:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Email: ${user.auth?.email || user.personalInfo?.contact?.email || user.email || "N/A"}`);
        console.log(`   - Name: ${user.personalInfo?.firstName || "N/A"} ${user.personalInfo?.lastName || "N/A"}`);
        console.log(`   - Password Set: ${!!(user.auth?.passwordHash || user.auth?.password) ? "Yes" : "No"}`);

        if (user.auth?.passwordHash) {
          console.log(`   - Password Hash (preview): ${user.auth.passwordHash.substring(0, 20)}...`);
        }
      });
    } else {
      console.log("\n❌ No pharmacy-related users found");
    }
  } catch (error) {
    console.error("❌ Error listing users:", error.message);
    console.error("Full error:", error);
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
  listAllUsers().catch(console.error);
}

module.exports = { listAllUsers };
