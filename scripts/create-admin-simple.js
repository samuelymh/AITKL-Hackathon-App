#!/usr/bin/env node

/**
 * Simple Admin User Creation Script
 * Creates admin users directly in MongoDB
 *
 * Usage: node scripts/create-admin-simple.js
 */

const readline = require("readline");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  return password.length >= 8 && password.length <= 128;
};

async function createAdminUser() {
  let client;

  try {
    console.log("\n🔧 Admin User Creation Tool\n");
    console.log("This tool creates admin users securely in the database.");
    console.log("All fields are required except phone number.\n");

    // Get user input
    const email = (await askQuestion("Email address: ")).trim();
    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      process.exit(1);
    }

    const password = await askQuestion("Password (min 8 chars): ");
    if (!isValidPassword(password)) {
      console.log("❌ Password must be between 8 and 128 characters");
      process.exit(1);
    }

    const firstName = (await askQuestion("First name: ")).trim();
    if (!firstName) {
      console.log("❌ First name is required");
      process.exit(1);
    }

    const lastName = (await askQuestion("Last name: ")).trim();
    if (!lastName) {
      console.log("❌ Last name is required");
      process.exit(1);
    }

    const phone = (await askQuestion("Phone number (optional): ")).trim();

    console.log("\n🔄 Creating admin user...");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [
        { "auth.email": email },
        { "personalInfo.contact.email": email },
        { "personalInfo.contact.searchableEmail": email },
      ],
    });

    if (existingUser) {
      console.log("❌ User with this email already exists");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate digital identifier
    const digitalIdentifier = randomUUID();

    // Create admin user document
    const now = new Date();
    const adminUser = {
      digitalIdentifier,

      // Authentication
      auth: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "admin",
        emailVerified: true,
        phoneVerified: !!phone,
        lastLogin: null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        tokenVersion: 1,
      },

      // Personal Information
      personalInfo: {
        firstName,
        lastName,
        dateOfBirth: new Date("1990-01-01"), // Default birth date for admin users
        contact: {
          email: email.toLowerCase().trim(),
          searchableEmail: email.toLowerCase().trim(),
          ...(phone && { phone }),
          verified: {
            email: true,
            phone: !!phone,
          },
        },
      },

      // Medical Info (minimal for admin users)
      medicalInfo: {
        smokingStatus: "never",
      },

      // Role and permissions
      role: "admin",

      // Audit fields (required by BaseSchema)
      auditCreatedBy: "admin-creation-script",
      auditCreatedDateTime: now.toISOString(),

      // Metadata (legacy fields)
      metadata: {
        isActive: true,
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    };

    // Insert admin user
    const result = await usersCollection.insertOne(adminUser);

    if (result.insertedId) {
      console.log("\n✅ Admin user created successfully!\n");
      console.log("Admin Details:");
      console.log(`- ID: ${result.insertedId}`);
      console.log(`- Email: ${email}`);
      console.log(`- Name: ${firstName} ${lastName}`);
      console.log(`- Role: admin`);
      console.log(`- Digital ID: ${digitalIdentifier}`);
      console.log(`- Created: ${new Date().toISOString()}`);

      // Log to audit collection if it exists
      try {
        const auditCollection = db.collection("auditlogs");
        await auditCollection.insertOne({
          action: "ADMIN_USER_CREATED",
          targetType: "USER",
          targetId: result.insertedId.toString(),
          actor: {
            type: "SYSTEM",
            identifier: "admin-creation-script",
          },
          details: {
            email,
            role: "admin",
            createdBy: "admin-creation-script",
          },
          timestamp: new Date(),
          metadata: {
            source: "admin-creation-script",
            method: "direct-database-insert",
          },
        });
        console.log("✅ Audit log created");
      } catch (auditError) {
        console.log("⚠️ Audit logging failed (non-critical):", auditError.message);
      }
    } else {
      console.log("❌ Failed to create admin user");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  } finally {
    rl.close();
    if (client) {
      await client.close();
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Admin creation cancelled");
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createAdminUser().catch(console.error);
}
