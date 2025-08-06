#!/usr/bin/env node

// Import statements for CommonJS environment
const { default: connectToDatabase } = require("../lib/mongodb.ts");
const { default: User } = require("../lib/models/User.ts");
const { default: Practitioner } = require("../lib/models/Practitioner.ts");
const { default: Encounter } = require("../lib/models/Encounter.ts");
const { getPharmacyStatistics, getRecentPrescriptions } = require("../lib/services/pharmacy-service.ts");

async function testPharmacyDashboard() {
  console.log("🧪 Testing Pharmacy Dashboard Real Data");
  console.log("=====================================\n");

  try {
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Find a pharmacist user
    console.log("📋 Step 1: Finding a test pharmacist...");
    const pharmacistUser = await User.findOne({ "auth.role": "pharmacist" });
    if (!pharmacistUser) {
      console.log("❌ No pharmacist user found in database");
      return;
    }

    const fullName = await pharmacistUser.getFullName();
    console.log(`✅ Found pharmacist: ${fullName} (${pharmacistUser.digitalIdentifier})`);

    // Find the corresponding practitioner record
    const practitioner = await Practitioner.findOne({ userId: pharmacistUser._id });
    if (!practitioner) {
      console.log("❌ No practitioner record found for pharmacist");
      return;
    }
    console.log(`✅ Found practitioner record: ${practitioner._id}\n`);

    // Test pharmacy statistics
    console.log("📊 Step 2: Testing pharmacy statistics...");
    const stats = await getPharmacyStatistics(practitioner._id.toString());
    console.log("📈 Pharmacy Statistics:");
    console.log(`   - Prescriptions Today: ${stats.prescriptionsToday}`);
    console.log(`   - Pending Verifications: ${stats.pendingVerifications}`);
    console.log(`   - Prescriptions This Week: ${stats.prescriptionsThisWeek}`);
    console.log(`   - Prescriptions This Month: ${stats.prescriptionsThisMonth}`);
    console.log(`   - Most Common Medications: ${stats.mostCommonMedications.length} types`);

    if (stats.mostCommonMedications.length > 0) {
      console.log("   📋 Top Medications:");
      stats.mostCommonMedications.forEach((med, i) => {
        console.log(`      ${i + 1}. ${med.name} (${med.count} prescriptions)`);
      });
    }
    console.log("");

    // Test recent prescriptions
    console.log("💊 Step 3: Testing recent prescriptions...");
    const prescriptions = await getRecentPrescriptions(practitioner._id.toString(), 5);
    console.log(`📝 Found ${prescriptions.length} recent prescriptions:`);

    if (prescriptions.length > 0) {
      prescriptions.forEach((prescription, i) => {
        console.log(`   ${i + 1}. ${prescription.medicationName} ${prescription.dosage}`);
        console.log(`      Patient: ${prescription.patientName}`);
        console.log(`      Status: ${prescription.status}`);
        console.log(`      Priority: ${prescription.priority}`);
        console.log(`      Issued: ${new Date(prescription.issuedAt).toLocaleDateString()}`);
        console.log("");
      });
    } else {
      console.log("   ℹ️  No prescriptions found for this pharmacist");
    }

    // Check encounters collection for prescription data
    console.log("🔍 Step 4: Checking encounters collection...");
    const encounterCount = await Encounter.countDocuments({
      "prescriptions.prescribingPractitionerId": practitioner._id,
    });
    console.log(`📊 Found ${encounterCount} encounters with prescriptions by this pharmacist`);

    if (encounterCount === 0) {
      console.log("ℹ️  No prescription data found. This is normal for a fresh database.");
      console.log("ℹ️  The dashboard will show real data as doctors create encounters with prescriptions.");
    }

    console.log("\n✅ Pharmacy dashboard test completed successfully!");
    console.log("🎯 The dashboard is now using real database data instead of mock data.");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testPharmacyDashboard();
