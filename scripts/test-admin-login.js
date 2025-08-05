#!/usr/bin/env node

/**
 * Test Admin Login Process
 * Simulates the login validation that happens in the application
 *
 * Usage: node scripts/test-admin-login.js <email> <password>
 */

const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

async function testAdminLogin(email, password) {
  let client;

  try {
    console.log("\n🧪 Testing Admin Login Process\n");
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${"*".repeat(password.length)}`);

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    console.log("\n🔍 Step 1: Finding user by email...");

    // Find user (simulating application login logic)
    const user = await usersCollection.findOne({
      $or: [
        { "auth.email": email.toLowerCase().trim() },
        { "personalInfo.contact.email": email.toLowerCase().trim() },
        { "personalInfo.contact.searchableEmail": email.toLowerCase().trim() },
      ],
    });

    if (!user) {
      console.log("❌ User not found");
      return { success: false, error: "User not found" };
    }

    console.log(`✅ User found: ${user._id}`);
    console.log(`📋 Role: ${user.role}`);

    console.log("\n🔍 Step 2: Validating user is admin...");
    if (user.role !== "admin") {
      console.log("❌ User is not an admin");
      return { success: false, error: "User is not an admin" };
    }
    console.log("✅ User is admin");

    console.log("\n🔍 Step 3: Checking required schema fields...");

    // Check required fields that caused the original error
    const requiredChecks = [
      { field: "auditCreatedBy", value: user.auditCreatedBy },
      { field: "auditCreatedDateTime", value: user.auditCreatedDateTime },
      { field: "personalInfo.dateOfBirth", value: user.personalInfo?.dateOfBirth },
    ];

    let schemaValid = true;
    for (const check of requiredChecks) {
      if (check.value === undefined || check.value === null) {
        console.log(`❌ Missing required field: ${check.field}`);
        schemaValid = false;
      } else {
        console.log(`✅ ${check.field}: ${check.value}`);
      }
    }

    if (!schemaValid) {
      console.log("❌ Schema validation failed");
      return { success: false, error: "Schema validation failed" };
    }

    console.log("✅ All required schema fields present");

    console.log("\n🔍 Step 4: Checking account status...");

    // Check if account is active
    if (user.metadata?.isActive === false) {
      console.log("❌ Account is deactivated");
      return { success: false, error: "Account is deactivated" };
    }

    if (user.auth?.accountLocked === true) {
      console.log("❌ Account is locked");
      return { success: false, error: "Account is locked" };
    }

    console.log("✅ Account is active and unlocked");

    console.log("\n🔍 Step 5: Verifying password...");

    const passwordHash = user.auth?.passwordHash;
    if (!passwordHash) {
      console.log("❌ No password hash found");
      return { success: false, error: "No password hash found" };
    }

    const isPasswordValid = await bcrypt.compare(password, passwordHash);
    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return { success: false, error: "Invalid password" };
    }

    console.log("✅ Password is valid");

    console.log("\n🔍 Step 6: Preparing user data for session...");

    // Simulate what the application would do
    const sessionData = {
      userId: user._id.toString(),
      email: user.auth?.email || user.personalInfo?.contact?.email,
      role: user.role,
      digitalIdentifier: user.digitalIdentifier,
      firstName: user.personalInfo?.firstName,
      lastName: user.personalInfo?.lastName,
      emailVerified: user.auth?.emailVerified || false,
      phoneVerified: user.auth?.phoneVerified || false,
    };

    console.log("✅ Session data prepared:");
    Object.entries(sessionData).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log("\n🎉 LOGIN SUCCESS!");
    console.log("✅ Admin can successfully log into the application");
    console.log("✅ All schema validations passed");
    console.log("✅ All authentication checks passed");

    return {
      success: true,
      user: sessionData,
      message: "Login successful",
    };
  } catch (error) {
    console.error("\n❌ LOGIN FAILED!");
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("\n🧪 Admin Login Test Tool\n");
    console.log("Usage:");
    console.log("  node scripts/test-admin-login.js <email> <password>");
    console.log("\nExamples:");
    console.log("  node scripts/test-admin-login.js admin@test.com newPassword123");
    console.log("  node scripts/test-admin-login.js admin2@healthcare.com KnownPassword123");
    console.log("\nThis tool simulates the complete login process to verify admin access.");
    process.exit(1);
  }

  if (args.length < 2) {
    console.log("❌ Missing arguments. Need: <email> <password>");
    console.log("Usage: node scripts/test-admin-login.js <email> <password>");
    process.exit(1);
  }

  return {
    email: args[0],
    password: args[1],
  };
}

// Run the script
if (require.main === module) {
  const { email, password } = parseArguments();
  testAdminLogin(email, password).catch(console.error);
}
