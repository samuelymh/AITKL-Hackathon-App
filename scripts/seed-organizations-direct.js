#!/usr/bin/env node

/**
 * Seed Organizations Script (Direct MongoDB)
 * Seeds organizations using direct MongoDB connection
 *
 * Usage: MONGODB_URI="..." node scripts/seed-organizations-direct.js
 */

const { MongoClient } = require("mongodb");

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "mongodb://localhost:27017/healthcare-app";

const sampleOrganizations = [
  {
    organizationInfo: {
      name: "General Hospital",
      type: "HOSPITAL",
      registrationNumber: "GH001",
      description: "A leading healthcare facility providing comprehensive medical services",
    },
    address: {
      street: "Jalan Hospital 123",
      city: "Kuala Lumpur",
      state: "Selangor",
      postalCode: "50000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0100",
      email: "info@generalhospital.com.my",
      website: "https://www.generalhospital.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2000-01-01"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "City Medical Center",
      type: "CLINIC",
      registrationNumber: "CMC002",
      description: "Community medical center serving the local area",
    },
    address: {
      street: "Jalan Kesihatan 456",
      city: "Petaling Jaya",
      state: "Selangor",
      postalCode: "46200",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0200",
      email: "contact@citymedical.com.my",
      website: "https://www.citymedical.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2010-06-15"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "MedPharm Pharmacy",
      type: "PHARMACY",
      registrationNumber: "MP003",
      description: "Full-service pharmacy with prescription and OTC medications",
    },
    address: {
      street: "Jalan Farmasi 789",
      city: "Johor Bahru",
      state: "Johor",
      postalCode: "80000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-7-555-0300",
      email: "info@medpharm.com.my",
      website: "https://www.medpharm.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2015-03-20"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "Wellness Clinic",
      type: "CLINIC",
      registrationNumber: "WC004",
      description: "Specialized wellness and preventive care clinic",
    },
    address: {
      street: "Jalan Wellness 321",
      city: "Penang",
      state: "Pulau Pinang",
      postalCode: "10000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-4-555-0400",
      email: "hello@wellnessclinic.com.my",
      website: "https://www.wellnessclinic.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2018-09-10"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
  {
    organizationInfo: {
      name: "DiagnoLab Diagnostics",
      type: "LABORATORY",
      registrationNumber: "DL005",
      description: "Comprehensive diagnostic laboratory services",
    },
    address: {
      street: "Jalan Diagnostik 888",
      city: "Shah Alam",
      state: "Selangor",
      postalCode: "40000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0500",
      email: "lab@diagnolab.com.my",
      website: "https://www.diagnolab.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2008-04-12"),
    },
    auditCreatedBy: "system-seed",
    auditCreatedDateTime: new Date(),
  },
];

async function seedOrganizations() {
  let client;

  try {
    console.log("\n🌱 Seeding Organizations\n");

    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const orgsCollection = db.collection("organizations");

    // Check existing organizations
    const existingCount = await orgsCollection.countDocuments({
      auditDeletedDateTime: { $exists: false },
    });
    console.log(`📊 Found ${existingCount} existing organization(s)`);

    if (existingCount < 6) { // Add organizations if we have less than 6
      console.log("🚀 Seeding additional organizations...\n");

      // Only add organizations that don't already exist (check by registration number)
      const organizationsToAdd = [];
      for (const org of sampleOrganizations) {
        const exists = await orgsCollection.findOne({
          "organizationInfo.registrationNumber": org.organizationInfo.registrationNumber,
          auditDeletedDateTime: { $exists: false },
        });
        if (!exists) {
          organizationsToAdd.push(org);
        }
      }

      if (organizationsToAdd.length > 0) {
        const results = await orgsCollection.insertMany(organizationsToAdd);
        console.log(`✅ Successfully inserted ${results.insertedCount} new organizations`);
        
        // Log each inserted organization
        for (let i = 0; i < organizationsToAdd.length; i++) {
          const org = organizationsToAdd[i];
          console.log(`   ${i + 1}. ${org.organizationInfo.name} (${org.organizationInfo.type}) - ${org.address.city}, ${org.address.state}`);
        }
      } else {
        console.log("ℹ️  All organizations already exist");
      }
    } else {
      console.log("⚠️  Already have sufficient organizations (6+), skipping seed");
    }

    // Final verification
    const finalCount = await orgsCollection.countDocuments({
      auditDeletedDateTime: { $exists: false },
    });
    const verifiedCount = await orgsCollection.countDocuments({
      "verification.isVerified": true,
      auditDeletedDateTime: { $exists: false },
    });

    console.log("\n📈 SUMMARY:");
    console.log(`   Total organizations: ${finalCount}`);
    console.log(`   Verified organizations: ${verifiedCount}`);
    
    if (verifiedCount > 0) {
      console.log("\n🎉 Seed completed successfully! Organizations are now available for the organization select component.");
    }

  } catch (error) {
    console.error("❌ Error seeding organizations:", error.message);
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
  console.log("\n\n👋 Seed operation cancelled");
  process.exit(0);
});

// Run the script
if (require.main === module) {
  seedOrganizations().catch(console.error);
}

module.exports = { seedOrganizations };
