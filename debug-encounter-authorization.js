// Debug Encounter Authorization Grants
// MongoDB URI: mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb+srv://extraordinary:9mrswpQP4adJ5e8T@cluster0.clxqg86.mongodb.net/healthapp?retryWrites=true&w=majority&appName=Cluster0";

async function debugAuthorizationGrants() {
  console.log("🔍 Debugging Authorization Grants for Encounter Creation...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db("healthapp");

    // Test data from your error log
    const patientDigitalId = "HID_6c46e5e6-2373-4785-815f-373c7c474d36";
    const doctorUserId = "689550c53a771dac2873ef14";
    const practitionerId = "689550c63a771dac2873ef16";
    const organizationId = "6891d7c43527d8696402570e";
    const specificGrantId = "689744bf68ab1873acce0cd9";

    console.log("📋 Debug Parameters:");
    console.log(`Patient Digital ID: ${patientDigitalId}`);
    console.log(`Doctor User ID: ${doctorUserId}`);
    console.log(`Practitioner ID: ${practitionerId}`);
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Specific Grant ID: ${specificGrantId}\n`);

    // 1. Find the patient
    console.log("1️⃣ Looking for patient...");
    const patient = await db.collection("users").findOne({
      digitalIdentifier: patientDigitalId,
    });

    if (!patient) {
      console.log("❌ Patient not found!");
      return;
    }

    console.log("✅ Patient found:", {
      id: patient._id.toString(),
      digitalId: patient.digitalIdentifier,
      name: `${patient.personalInfo?.firstName || ""} ${patient.personalInfo?.lastName || ""}`.trim(),
    });
    console.log();

    // 2. Check the specific grant ID mentioned in logs
    console.log("2️⃣ Checking specific grant ID...");
    const specificGrant = await db.collection("authorizationgrants").findOne({
      _id: { $oid: specificGrantId },
    });

    if (specificGrant) {
      console.log("✅ Specific grant found:", {
        id: specificGrant._id.toString(),
        status: specificGrant.grantDetails?.status,
        expiresAt: specificGrant.grantDetails?.expiresAt,
        canCreateEncounters: specificGrant.accessScope?.canCreateEncounters,
        userId: specificGrant.userId?.toString(),
        organizationId: specificGrant.organizationId?.toString(),
      });
    } else {
      console.log("❌ Specific grant not found");
    }
    console.log();

    // 3. Find all grants for this patient
    console.log("3️⃣ Finding all grants for patient...");
    const allPatientGrants = await db
      .collection("authorizationgrants")
      .find({
        userId: patient._id,
      })
      .toArray();

    console.log(`📊 Total grants for patient: ${allPatientGrants.length}`);

    allPatientGrants.forEach((grant, index) => {
      console.log(`\n📋 Grant ${index + 1}:`);
      console.log(`  ID: ${grant._id.toString()}`);
      console.log(`  Status: ${grant.grantDetails?.status}`);
      console.log(`  Expires: ${grant.grantDetails?.expiresAt}`);
      console.log(`  Organization: ${grant.organizationId?.toString()}`);
      console.log(`  Can Create Encounters: ${grant.accessScope?.canCreateEncounters}`);
      console.log(`  Practitioner: ${grant.practitionerId?.toString()}`);

      // Check if this grant should be active
      const now = new Date();
      const expiresAt = new Date(grant.grantDetails?.expiresAt);
      const isActive = grant.grantDetails?.status === "ACTIVE" && expiresAt > now;
      const hasPermission = grant.accessScope?.canCreateEncounters === true;
      const matchesOrg = grant.organizationId?.toString() === organizationId;

      console.log(
        `  ⏰ Is Active: ${isActive} (Status: ${grant.grantDetails?.status}, Expires: ${expiresAt > now ? "Future" : "Past"})`
      );
      console.log(`  🔑 Has Permission: ${hasPermission}`);
      console.log(`  🏥 Matches Org: ${matchesOrg}`);
      console.log(`  ✅ Should Work: ${isActive && hasPermission && matchesOrg}`);
    });

    // 4. Check what the encounter creation logic should find
    console.log("\n4️⃣ Testing encounter creation grant lookup...");

    // Test the exact query used in encounter creation
    const encounterGrantQuery = {
      userId: patient._id,
      organizationId: { $oid: organizationId },
      "grantDetails.status": "ACTIVE",
      "grantDetails.expiresAt": { $gt: new Date() },
      "accessScope.canCreateEncounters": true,
    };

    console.log("🔍 Query being used:", JSON.stringify(encounterGrantQuery, null, 2));

    const foundGrant = await db.collection("authorizationgrants").findOne(encounterGrantQuery);

    if (foundGrant) {
      console.log("✅ Grant found by encounter logic:", {
        id: foundGrant._id.toString(),
        status: foundGrant.grantDetails?.status,
        expiresAt: foundGrant.grantDetails?.expiresAt,
        canCreateEncounters: foundGrant.accessScope?.canCreateEncounters,
      });
    } else {
      console.log("❌ No grant found by encounter logic");

      // Let's try a more relaxed query to see what's there
      console.log("\n🔍 Trying relaxed query to find any grants...");
      const relaxedGrants = await db
        .collection("authorizationgrants")
        .find({
          userId: patient._id,
          organizationId: { $oid: organizationId },
        })
        .toArray();

      console.log(`Found ${relaxedGrants.length} grants with relaxed criteria:`);
      relaxedGrants.forEach((grant) => {
        console.log(`  - ID: ${grant._id.toString()}`);
        console.log(`    Status: ${grant.grantDetails?.status}`);
        console.log(`    Expires: ${grant.grantDetails?.expiresAt}`);
        console.log(`    Can Create: ${grant.accessScope?.canCreateEncounters}`);
        console.log("");
      });
    }

    // 5. Check organization member
    console.log("5️⃣ Checking organization membership...");
    const orgMember = await db.collection("organizationmembers").findOne({
      practitionerId: { $oid: practitionerId },
      status: { $in: ["active", "pending", "pending_verification"] },
    });

    if (orgMember) {
      console.log("✅ Organization member found:", {
        id: orgMember._id.toString(),
        organizationId: orgMember.organizationId?.toString(),
        status: orgMember.status,
      });
    } else {
      console.log("❌ Organization member not found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

debugAuthorizationGrants().catch(console.error);
