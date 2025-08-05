#!/usr/bin/env node

/**
 * Create Pharmacist User Script
 * Creates a test pharmacist user in the database
 *
 * Usage: node scripts/create-pharmacist-user.js <email> <password> <firstName> <lastName>
 */

const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  return password.length >= 8 && password.length <= 128;
};

async function createPharmacistUser(email, password, firstName, lastName) {
  let client;

  try {
    console.log("\n💊 Creating Pharmacist User\n");

    // Validate inputs
    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      return;
    }

    if (!isValidPassword(password)) {
      console.log("❌ Password must be between 8 and 128 characters");
      return;
    }

    if (!firstName || !lastName) {
      console.log("❌ First name and last name are required");
      return;
    }

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ "auth.email": email.toLowerCase().trim() }, { "personalInfo.contact.email": email.toLowerCase().trim() }],
    });

    if (existingUser) {
      console.log("❌ User with this email already exists");
      console.log(`   - Existing user ID: ${existingUser._id}`);
      console.log(`   - Role: ${existingUser.role}`);
      console.log(`   - Name: ${existingUser.personalInfo?.firstName} ${existingUser.personalInfo?.lastName}`);
      return;
    }

    // Hash the password
    console.log("🔒 Hashing password...");
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate digital identifier
    const digitalIdentifier = `PH_${uuidv4()}`;

    // Create user document
    const now = new Date();
    const userDoc = {
      digitalIdentifier,
      role: "pharmacist",
      personalInfo: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contact: {
          email: email.toLowerCase().trim(),
          phone: "+1234567890", // Default phone
        },
      },
      auth: {
        email: email.toLowerCase().trim(),
        passwordHash,
        emailVerified: true, // Auto-verify for testing
        phoneVerified: false,
        accountLocked: false,
        failedLoginAttempts: 0,
        lastLoginAt: null,
      },
      professionalInfo: {
        licenseNumber: `PH${Math.floor(100000 + Math.random() * 900000)}`, // Random license number
        specialty: "General Pharmacy",
        yearsOfExperience: 5,
        currentPosition: "Staff Pharmacist",
        department: "Pharmacy",
      },
      metadata: {
        isActive: true,
        createdAt: now,
        updatedAt: now,
        passwordChangedAt: now,
      },
      auditCreatedDateTime: now,
      auditUpdatedDateTime: now,
      auditCreatedBy: "create-pharmacist-script",
      auditUpdatedBy: "create-pharmacist-script",
    };

    // Insert the user
    console.log("👤 Creating pharmacist user...");
    const result = await usersCollection.insertOne(userDoc);

    if (result.insertedId) {
      console.log("\n✅ Pharmacist user created successfully!");
      console.log(`- User ID: ${result.insertedId}`);
      console.log(`- Digital ID: ${digitalIdentifier}`);
      console.log(`- Email: ${email}`);
      console.log(`- Name: ${firstName} ${lastName}`);
      console.log(`- Role: pharmacist`);
      console.log(`- License Number: ${userDoc.professionalInfo.licenseNumber}`);
      console.log(`- Password: ${password}`);
      console.log(`- Created: ${now.toISOString()}`);

      // Create audit log
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "PHARMACIST_USER_CREATED",
          targetType: "USER",
          targetId: result.insertedId.toString(),
          actor: {
            type: "SYSTEM",
            identifier: "create-pharmacist-script",
          },
          details: {
            email: email,
            digitalId: digitalIdentifier,
            name: `${firstName} ${lastName}`,
            createdBy: "create-pharmacist-script",
            timestamp: now.toISOString(),
          },
          timestamp: now,
          metadata: {
            source: "create-pharmacist-script",
            method: "direct-database-insert",
            userRole: "pharmacist",
          },
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical):", auditError.message);
      }

      console.log("\n🔐 Login Instructions:");
      console.log("   1. Go to: http://localhost:3006/login");
      console.log(`   2. Email: ${email}`);
      console.log(`   3. Password: ${password}`);
      console.log("   4. You'll be redirected to the pharmacy dashboard");
    } else {
      console.log("❌ Failed to create pharmacist user");
    }
  } catch (error) {
    console.error("❌ Error creating pharmacist user:", error.message);
    process.exit(1);
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
    console.log("\n💊 Create Pharmacist User Tool\n");
    console.log("Usage:");
    console.log("  node scripts/create-pharmacist-user.js <email> <password> <firstName> <lastName>");
    console.log("\nExamples:");
    console.log("  node scripts/create-pharmacist-user.js pharmacist@hospital.com pharmacy123 John Doe");
    console.log("  node scripts/create-pharmacist-user.js sarah.pharmacy@clinic.com securePass789 Sarah Johnson");
    console.log("\nNote: Password must be between 8-128 characters");
    console.log("\nAfter creation, use this to list all pharmacists:");
    console.log("  node scripts/list-pharmacist-users.js");
    process.exit(1);
  }

  if (args.length < 4) {
    console.log("❌ Missing arguments. Need: <email> <password> <firstName> <lastName>");
    console.log("Usage: node scripts/create-pharmacist-user.js <email> <password> <firstName> <lastName>");
    process.exit(1);
  }

  return {
    email: args[0],
    password: args[1],
    firstName: args[2],
    lastName: args[3],
  };
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 User creation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  const { email, password, firstName, lastName } = parseArguments();
  createPharmacistUser(email, password, firstName, lastName).catch(console.error);
}

module.exports = { createPharmacistUser };
