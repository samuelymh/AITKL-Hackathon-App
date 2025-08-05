const mongoose = require("mongoose");

// Import the models
const Organization = require("../lib/models/Organization.ts").default;
const { connectToDatabase } = require("../lib/db.connection.ts");

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
  },
  {
    organizationInfo: {
      name: "Metro Pharmacy",
      type: "PHARMACY",
      registrationNumber: "MP005",
      description: "Urban pharmacy serving downtown area",
    },
    address: {
      street: "Jalan Metro 555",
      city: "Shah Alam",
      state: "Selangor",
      postalCode: "40000",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-3-555-0500",
      email: "service@metropharmacy.com.my",
      website: "https://www.metropharmacy.com.my",
    },
    verification: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: "system-admin",
    },
    metadata: {
      isActive: true,
      memberCount: 0,
      establishedDate: new Date("2012-11-05"),
    },
  },
  {
    organizationInfo: {
      name: "DiagnoLab Diagnostics",
      type: "LABORATORY",
      registrationNumber: "DL006",
      description: "Comprehensive diagnostic laboratory services",
    },
    address: {
      street: "Jalan Diagnostik 888",
      city: "Johor Bahru",
      state: "Johor",
      postalCode: "80100",
      country: "Malaysia",
    },
    contact: {
      phone: "+60-7-555-0600",
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
  },
];

async function seedOrganizations() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();

    console.log("Checking existing organizations...");
    const existingCount = await Organization.countDocuments();
    console.log(`Found ${existingCount} existing organizations`);

    if (existingCount === 0) {
      console.log("Seeding organizations...");

      for (const orgData of sampleOrganizations) {
        // Add audit fields
        orgData.auditCreatedBy = "system-seed";
        orgData.auditCreatedDateTime = new Date();

        const organization = new Organization(orgData);
        await organization.save();
        console.log(`Created organization: ${orgData.organizationInfo.name}`);
      }

      console.log(`Successfully seeded ${sampleOrganizations.length} organizations`);
    } else {
      console.log("Organizations already exist, skipping seed");
    }

    // Verify organizations were created
    const finalCount = await Organization.countDocuments();
    const verifiedCount = await Organization.countDocuments({ "verification.isVerified": true });
    console.log(`Total organizations: ${finalCount}`);
    console.log(`Verified organizations: ${verifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding organizations:", error);
    process.exit(1);
  }
}

seedOrganizations();
