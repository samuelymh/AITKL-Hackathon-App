// Fix All Doctor Authorization Grants - Root Cause Fix
// This script ensures ALL doctors have canCreateEncounters permission in their authorization grants
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function fixAllDoctorGrants() {
  console.log("🏥 Fixing ALL Doctor Authorization Grants - Root Cause Fix\n");
  console.log("This will ensure ALL doctors can create encounters by default.\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("healthapp");

    // Step 1: Find all authorization grants
    console.log("🔍 Step 1: Finding all authorization grants...");
    const allGrants = await db.collection("authorization_grants").find({}).toArray();

    console.log(`📊 Found ${allGrants.length} total authorization grants`);

    // Step 2: Filter grants that are missing canCreateEncounters permission
    console.log("\n🔍 Step 2: Analyzing grants for missing canCreateEncounters permission...");

    const grantsNeedingFix = allGrants.filter((grant) => {
      const hasPermission = grant.accessScope?.canCreateEncounters === true;
      const isActive = grant.grantDetails?.status === "ACTIVE";
      const isNotExpired = new Date(grant.grantDetails?.expiresAt) > new Date();

      // We want to fix active, non-expired grants that don't have the permission
      return isActive && isNotExpired && !hasPermission;
    });

    console.log(`📋 Grants needing fix: ${grantsNeedingFix.length}`);

    if (grantsNeedingFix.length === 0) {
      console.log("✅ All active grants already have canCreateEncounters permission!");
      return;
    }

    // Step 3: Show what will be updated
    console.log("\n📋 Grants that will be updated:");
    grantsNeedingFix.forEach((grant, index) => {
      console.log(`  ${index + 1}. Grant ${grant._id}`);
      console.log(`     Status: ${grant.grantDetails?.status}`);
      console.log(`     Expires: ${grant.grantDetails?.expiresAt}`);
      console.log(
        `     Current permissions: ${Object.keys(grant.accessScope || {})
          .filter((k) => grant.accessScope[k])
          .join(", ")}`
      );
      console.log("");
    });

    // Step 4: Confirm before proceeding
    console.log(
      `\n🚨 About to update ${grantsNeedingFix.length} authorization grants to include canCreateEncounters permission.`
    );
    console.log("This will allow all doctors in these grants to create medical encounters.\n");

    // For automation, we'll proceed automatically. In production, you might want confirmation.
    console.log("🔧 Proceeding with bulk update...\n");

    // Step 5: Bulk update all grants
    const grantIds = grantsNeedingFix.map((grant) => grant._id);

    const bulkUpdateResult = await db.collection("authorization_grants").updateMany(
      {
        _id: { $in: grantIds },
      },
      {
        $set: {
          "accessScope.canCreateEncounters": true,
          auditModifiedBy: "system-bulk-fix",
          auditModifiedDateTime: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Bulk update completed!`);
    console.log(`   📊 Matched: ${bulkUpdateResult.matchedCount} grants`);
    console.log(`   📝 Modified: ${bulkUpdateResult.modifiedCount} grants`);

    // Step 6: Verify the updates
    console.log("\n🔍 Step 6: Verifying updates...");

    const updatedGrants = await db
      .collection("authorization_grants")
      .find({
        _id: { $in: grantIds },
      })
      .toArray();

    let successCount = 0;
    let failCount = 0;

    updatedGrants.forEach((grant, index) => {
      const hasPermission = grant.accessScope?.canCreateEncounters === true;
      if (hasPermission) {
        successCount++;
        console.log(`  ✅ Grant ${grant._id}: canCreateEncounters = ${hasPermission}`);
      } else {
        failCount++;
        console.log(`  ❌ Grant ${grant._id}: canCreateEncounters = ${hasPermission}`);
      }
    });

    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Successfully updated: ${successCount} grants`);
    console.log(`   ❌ Failed to update: ${failCount} grants`);

    if (failCount === 0) {
      console.log("\n🎉 SUCCESS! All authorization grants now have canCreateEncounters permission!");
      console.log("   🏥 All doctors should now be able to create medical encounters.");
      console.log("   🔒 This fixes the root cause of the 403 Forbidden errors.");
    } else {
      console.log("\n⚠️  Some grants failed to update. Please check the logs above.");
    }

    // Step 7: Show final statistics
    console.log("\n📊 Final Statistics:");
    const finalAllGrants = await db.collection("authorization_grants").find({}).toArray();
    const activeGrantsWithPermission = finalAllGrants.filter((grant) => {
      const hasPermission = grant.accessScope?.canCreateEncounters === true;
      const isActive = grant.grantDetails?.status === "ACTIVE";
      const isNotExpired = new Date(grant.grantDetails?.expiresAt) > new Date();
      return isActive && isNotExpired && hasPermission;
    });

    const activeGrantsTotal = finalAllGrants.filter((grant) => {
      const isActive = grant.grantDetails?.status === "ACTIVE";
      const isNotExpired = new Date(grant.grantDetails?.expiresAt) > new Date();
      return isActive && isNotExpired;
    });

    console.log(`   📈 Active grants with canCreateEncounters: ${activeGrantsWithPermission.length}`);
    console.log(`   📊 Total active grants: ${activeGrantsTotal.length}`);
    console.log(
      `   🎯 Coverage: ${activeGrantsTotal.length > 0 ? Math.round((activeGrantsWithPermission.length / activeGrantsTotal.length) * 100) : 0}%`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n🔌 Database connection closed.");
  }
}

fixAllDoctorGrants().catch(console.error);
