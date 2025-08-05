#!/usr/bin/env node

/**
 * Fix Existing Admin Users Script
 * Updates existing admin users to include required schema fields
 * 
 * Usage: node scripts/fix-existing-admins.js
 */

const { MongoClient, ObjectId } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function fixExistingAdmins() {
  let client;
  
  try {
    console.log("\n🔧 Fixing Existing Admin Users\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Find all admin users that might be missing required fields
    const adminUsers = await usersCollection.find({ 
      role: "admin" 
    }).toArray();

    if (adminUsers.length === 0) {
      console.log("📭 No admin users found");
      return;
    }

    console.log(`📊 Found ${adminUsers.length} admin user(s) to check/fix:\n`);

    let fixedCount = 0;

    for (const admin of adminUsers) {
      console.log(`🔍 Checking admin: ${admin._id}`);
      console.log(`   Email: ${admin.auth?.email || admin.personalInfo?.contact?.email || 'N/A'}`);
      console.log(`   Name: ${admin.personalInfo?.firstName || 'N/A'} ${admin.personalInfo?.lastName || 'N/A'}`);

      const updateFields = {};
      const setOperations = {};
      let needsUpdate = false;

      // Check and fix audit fields
      if (!admin.auditCreatedBy) {
        setOperations.auditCreatedBy = "admin-creation-script";
        needsUpdate = true;
        console.log("   ➕ Adding auditCreatedBy");
      }

      if (!admin.auditCreatedDateTime) {
        setOperations.auditCreatedDateTime = admin.metadata?.createdAt?.toISOString() || new Date().toISOString();
        needsUpdate = true;
        console.log("   ➕ Adding auditCreatedDateTime");
      }

      // Check and fix dateOfBirth
      if (!admin.personalInfo?.dateOfBirth) {
        setOperations["personalInfo.dateOfBirth"] = new Date("1990-01-01");
        needsUpdate = true;
        console.log("   ➕ Adding personalInfo.dateOfBirth");
      }

      // Fix auth structure if needed
      if (admin.auth && !admin.auth.role) {
        setOperations["auth.role"] = "admin";
        needsUpdate = true;
        console.log("   ➕ Adding auth.role");
      }

      if (admin.auth && admin.auth.emailVerified === undefined) {
        setOperations["auth.emailVerified"] = true;
        needsUpdate = true;
        console.log("   ➕ Adding auth.emailVerified");
      }

      if (admin.auth && admin.auth.phoneVerified === undefined) {
        setOperations["auth.phoneVerified"] = !!admin.personalInfo?.contact?.phone;
        needsUpdate = true;
        console.log("   ➕ Adding auth.phoneVerified");
      }

      if (admin.auth && !admin.auth.lastLogin) {
        setOperations["auth.lastLogin"] = null;
        needsUpdate = true;
        console.log("   ➕ Adding auth.lastLogin");
      }

      if (admin.auth && admin.auth.loginAttempts === undefined) {
        setOperations["auth.loginAttempts"] = 0;
        needsUpdate = true;
        console.log("   ➕ Adding auth.loginAttempts");
      }

      if (admin.auth && admin.auth.accountLocked === undefined) {
        setOperations["auth.accountLocked"] = false;
        needsUpdate = true;
        console.log("   ➕ Adding auth.accountLocked");
      }

      if (admin.auth && !admin.auth.accountLockedUntil) {
        setOperations["auth.accountLockedUntil"] = null;
        needsUpdate = true;
        console.log("   ➕ Adding auth.accountLockedUntil");
      }

      if (admin.auth && admin.auth.tokenVersion === undefined) {
        setOperations["auth.tokenVersion"] = 1;
        needsUpdate = true;
        console.log("   ➕ Adding auth.tokenVersion");
      }

      // Fix contact verification structure
      if (admin.personalInfo?.contact && !admin.personalInfo.contact.verified) {
        setOperations["personalInfo.contact.verified"] = {
          email: true,
          phone: !!admin.personalInfo.contact.phone
        };
        needsUpdate = true;
        console.log("   ➕ Adding personalInfo.contact.verified");
      }

      // Add basic medical info if missing
      if (!admin.medicalInfo) {
        setOperations.medicalInfo = {
          smokingStatus: "never"
        };
        needsUpdate = true;
        console.log("   ➕ Adding medicalInfo");
      }

      // Apply updates if needed
      if (needsUpdate) {
        const result = await usersCollection.updateOne(
          { _id: admin._id },
          { $set: setOperations }
        );

        if (result.modifiedCount > 0) {
          console.log("   ✅ Admin user updated successfully");
          fixedCount++;
        } else {
          console.log("   ⚠️ Admin user update failed");
        }
      } else {
        console.log("   ✅ Admin user already has all required fields");
      }

      console.log("");
    }

    console.log(`🎯 Summary: Fixed ${fixedCount} out of ${adminUsers.length} admin users`);

    // Verify all admins now have required fields
    console.log("\n🔍 Verifying all admins have required fields...");
    const problematicAdmins = await usersCollection.find({
      role: "admin",
      $or: [
        { auditCreatedBy: { $exists: false } },
        { auditCreatedDateTime: { $exists: false } },
        { "personalInfo.dateOfBirth": { $exists: false } }
      ]
    }).toArray();

    if (problematicAdmins.length === 0) {
      console.log("✅ All admin users now have required fields!");
    } else {
      console.log(`⚠️ Still found ${problematicAdmins.length} admin(s) with missing fields:`);
      problematicAdmins.forEach(admin => {
        console.log(`- ${admin._id}: ${admin.auth?.email || admin.personalInfo?.contact?.email}`);
      });
    }

  } catch (error) {
    console.error("❌ Error fixing admin users:", error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Fix operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  fixExistingAdmins().catch(console.error);
}
