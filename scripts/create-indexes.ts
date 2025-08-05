/**
 * Database indexes for improved performance
 * Run this script to add indexes to frequently queried fields
 */

import connectToDatabase from "@/lib/mongodb";
import Organization from "@/lib/models/Organization";

async function createIndexes() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();

    console.log("Creating indexes for Organization collection...");

    // Index for organization search by name
    await Organization.collection.createIndex({ "organizationInfo.name": "text" }, { name: "organization_name_text" });

    // Index for organization search by registration number
    await Organization.collection.createIndex(
      { "organizationInfo.registrationNumber": 1 },
      { name: "organization_registration_number", sparse: true }
    );

    // Index for location-based searches
    await Organization.collection.createIndex(
      { "address.city": 1, "address.state": 1 },
      { name: "organization_location" }
    );

    // Index for organization type filtering
    await Organization.collection.createIndex({ "organizationInfo.type": 1 }, { name: "organization_type" });

    // Index for verification status
    await Organization.collection.createIndex({ "verification.isVerified": 1 }, { name: "organization_verification" });

    // Index for audit fields (soft delete)
    await Organization.collection.createIndex({ auditDeletedDateTime: 1 }, { name: "organization_audit_deleted" });

    // Compound index for common search queries
    await Organization.collection.createIndex(
      {
        "organizationInfo.type": 1,
        "address.city": 1,
        "verification.isVerified": 1,
        auditDeletedDateTime: 1,
      },
      { name: "organization_search_compound" }
    );

    // Index for geospatial queries (if coordinates are used)
    await Organization.collection.createIndex(
      { "address.coordinates": "2dsphere" },
      { name: "organization_geospatial", sparse: true }
    );

    console.log("✅ All indexes created successfully!");

    // List all indexes
    const indexes = await Organization.collection.listIndexes().toArray();
    console.log("\nCurrent indexes:");
    indexes.forEach((index: any) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  } finally {
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  createIndexes();
}

export { createIndexes };
