#!/usr/bin/env node

/**
 * Admin User Creation Script
 *
 * This script creates admin users directly in the database.
 * Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>
 *
 * Example: node scripts/create-admin.js admin@hospital.com securePass123 John Doe
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

// Import models
const User = require("../lib/models/User").default;
const connectToDatabase = require("../lib/mongodb").default;

async function createAdminUser(email, password, firstName, lastName) {
  try {
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database");

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      "personalInfo.contact.email": email,
      "auth.role": "admin",
    });

    if (existingAdmin) {
      console.log("❌ Admin user with this email already exists");
      process.exit(1);
    }

    // Check if any user with this email exists
    const existingUser = await User.findOne({
      "personalInfo.contact.searchableEmail": email.toLowerCase().trim(),
    });

    if (existingUser) {
      console.log("❌ User with this email already exists");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    console.log("✅ Password hashed");

    // Generate digital identifier
    const digitalIdentifier = randomUUID();

    // Create admin user
    const adminUser = new User({
      digitalIdentifier,
      personalInfo: {
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: new Date("1990-01-01"), // Default date for admin
        contact: {
          email: email,
          phone: "+1-000-000-0000", // Default phone for admin
          searchableEmail: email.toLowerCase().trim(),
          verified: {
            email: true, // Auto-verify admin email
            phone: false,
          },
        },
      },
      medicalInfo: {
        // Admin doesn't need medical info
      },
      auth: {
        passwordHash,
        role: "admin",
        emailVerified: true, // Auto-verify admin
        phoneVerified: false,
        lastLogin: null,
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        tokenVersion: 1,
      },
      auditCreatedBy: "system-admin-script",
      auditCreatedDateTime: new Date(),
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully");
    console.log("📧 Email:", email);
    console.log("👤 Name:", `${firstName} ${lastName}`);
    console.log("🆔 Digital ID:", digitalIdentifier);
    console.log("🔑 Role: admin");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 4) {
  console.log("Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>");
  console.log("Example: node scripts/create-admin.js admin@hospital.com securePass123 John Doe");
  process.exit(1);
}

const [email, password, firstName, lastName] = args;

// Validate inputs
if (!email || !email.includes("@")) {
  console.log("❌ Invalid email address");
  process.exit(1);
}

if (!password || password.length < 8) {
  console.log("❌ Password must be at least 8 characters");
  process.exit(1);
}

if (!firstName || !lastName) {
  console.log("❌ First name and last name are required");
  process.exit(1);
}

// Create admin user
createAdminUser(email, password, firstName, lastName);
