/**
 * Migration Script: Transition from direct organization association to OrganizationMember model
 *
 * This script helps migrate existing Practitioner records that have a direct organizationId
 * to the new OrganizationMember model structure.
 *
 * Usage: node scripts/migrate-to-organization-members.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Schema definitions for migration
const practitionerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" }, // Old field
    professionalInfo: {
      licenseNumber: String,
      specialty: String,
      practitionerType: String,
      yearsOfExperience: Number,
      currentPosition: String,
      department: String,
    },
    status: String,
  },
  { collection: "practitioners" }
);

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "Practitioner", required: true },
    membershipDetails: {
      role: String,
      accessLevel: { type: String, default: "limited" },
      department: String,
      position: String,
      isPrimary: { type: Boolean, default: false },
      startDate: { type: Date, default: Date.now },
    },
    status: { type: String, default: "active" },
    permissions: {
      canAccessPatientRecords: { type: Boolean, default: false },
      canModifyPatientRecords: { type: Boolean, default: false },
      canPrescribeMedications: { type: Boolean, default: false },
      canViewAuditLogs: { type: Boolean, default: false },
      canManageMembers: { type: Boolean, default: false },
      canManageOrganization: { type: Boolean, default: false },
      canRequestAuthorizationGrants: { type: Boolean, default: false },
      canApproveAuthorizationGrants: { type: Boolean, default: false },
      canRevokeAuthorizationGrants: { type: Boolean, default: false },
      specialPermissions: [String],
    },
  },
  { timestamps: true, collection: "organizationMembers" }
);

const Practitioner = mongoose.model("PractitionerMigration", practitionerSchema);
const OrganizationMember = mongoose.model("OrganizationMemberMigration", organizationMemberSchema);

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
}

async function migratePractitionersToOrganizationMembers() {
  try {
    await connectDB();

    console.log("Starting migration...");

    // Find all practitioners that have an organizationId (old structure)
    const practitionersWithOrg = await Practitioner.find({
      organizationId: { $exists: true, $ne: null },
    });

    console.log(`Found ${practitionersWithOrg.length} practitioners to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const practitioner of practitionersWithOrg) {
      try {
        // Check if organization membership already exists
        const existingMembership = await OrganizationMember.findOne({
          practitionerId: practitioner._id,
          organizationId: practitioner.organizationId,
        });

        if (existingMembership) {
          console.log(`Skipping practitioner ${practitioner._id} - membership already exists`);
          skipped++;
          continue;
        }

        // Create organization membership
        const membershipData = {
          organizationId: practitioner.organizationId,
          practitionerId: practitioner._id,
          membershipDetails: {
            role: practitioner.professionalInfo?.practitionerType || "doctor",
            accessLevel: "limited",
            department: practitioner.professionalInfo?.department,
            position: practitioner.professionalInfo?.currentPosition,
            isPrimary: true, // Assume first/only organization is primary
            startDate: practitioner.createdAt || new Date(),
          },
          status: practitioner.status === "active" ? "active" : "pending",
        };

        // Set default permissions based on practitioner type
        const role = practitioner.professionalInfo?.practitionerType || "doctor";
        switch (role) {
          case "doctor":
            membershipData.permissions = {
              canAccessPatientRecords: true,
              canModifyPatientRecords: true,
              canPrescribeMedications: true,
              canRequestAuthorizationGrants: true,
              canApproveAuthorizationGrants: true,
            };
            break;
          case "nurse":
            membershipData.permissions = {
              canAccessPatientRecords: true,
              canModifyPatientRecords: true,
              canRequestAuthorizationGrants: true,
            };
            break;
          case "pharmacist":
            membershipData.permissions = {
              canAccessPatientRecords: true,
              canPrescribeMedications: true,
              canRequestAuthorizationGrants: true,
            };
            break;
          case "admin":
            membershipData.permissions = {
              canAccessPatientRecords: true,
              canModifyPatientRecords: true,
              canViewAuditLogs: true,
              canManageMembers: true,
              canManageOrganization: true,
              canRequestAuthorizationGrants: true,
              canApproveAuthorizationGrants: true,
              canRevokeAuthorizationGrants: true,
            };
            break;
          default:
            membershipData.permissions = {
              canAccessPatientRecords: true,
            };
        }

        const membership = new OrganizationMember(membershipData);
        await membership.save();

        console.log(
          `Created membership for practitioner ${practitioner._id} in organization ${practitioner.organizationId}`
        );
        migrated++;
      } catch (error) {
        console.error(`Error migrating practitioner ${practitioner._id}:`, error.message);
      }
    }

    console.log(`Migration completed: ${migrated} migrated, ${skipped} skipped`);

    // Optionally remove organizationId field from practitioners
    if (process.argv.includes("--remove-old-field")) {
      console.log("Removing organizationId field from practitioners...");
      await Practitioner.updateMany({ organizationId: { $exists: true } }, { $unset: { organizationId: 1 } });
      console.log("Old organizationId field removed from practitioners");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run migration
if (require.main === module) {
  migratePractitionersToOrganizationMembers()
    .then(() => {
      console.log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migratePractitionersToOrganizationMembers };
