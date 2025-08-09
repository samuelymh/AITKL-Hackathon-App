const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function debugClinicalAssistantFlow() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("=== DEBUGGING CLINICAL ASSISTANT FLOW ===");

    // Test the exact patient ID that would be used
    const testPatientId = "HID_12d542e1-22e3-4a22-9504-3dd7e1fc8845";

    console.log("\n🔍 Step 1: Testing Medical History API Flow");

    // Find patient by digital ID (like the medical history API does)
    const patient = await db.collection("users").findOne({
      digitalIdentifier: testPatientId,
      "auth.role": "patient",
    });

    if (!patient) {
      console.log('❌ Patient not found with auth.role: "patient"');

      // Try alternative searches
      const patientByType = await db.collection("users").findOne({
        digitalIdentifier: testPatientId,
        type: "patient",
      });

      const patientByRole = await db.collection("users").findOne({
        digitalIdentifier: testPatientId,
        role: "patient",
      });

      console.log("Patient by type:", patientByType ? "Found" : "Not found");
      console.log("Patient by role:", patientByRole ? "Found" : "Not found");

      if (patientByType || patientByRole) {
        console.log("\n🔧 ISSUE FOUND: Medical history API searches for auth.role but patients have role/type fields");
      }
      return;
    }

    console.log("✅ Patient found:", {
      id: patient._id.toString(),
      digitalId: patient.digitalIdentifier,
      role: patient.role,
      authRole: patient.auth?.role,
      type: patient.type,
    });

    // Test patient context gathering (simulate PatientContextService)
    console.log("\n🔍 Step 2: Testing Patient Context Gathering");

    const userId = patient._id.toString();
    console.log("Using userId:", userId);

    // Get recent encounters (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentEncounters = await db
      .collection("encounters")
      .find({
        userId: new ObjectId(userId),
        "encounter.encounterDate": { $gte: sixMonthsAgo },
      })
      .sort({ "encounter.encounterDate": -1 })
      .limit(10)
      .toArray();

    console.log(`✅ Recent encounters found: ${recentEncounters.length}`);

    if (recentEncounters.length > 0) {
      const sampleEncounter = recentEncounters[0];
      console.log("Sample encounter:", {
        chiefComplaint: sampleEncounter.encounter?.chiefComplaint,
        diagnosesCount: sampleEncounter.diagnoses?.length || 0,
        prescriptionsCount: sampleEncounter.prescriptions?.length || 0,
        vitals: sampleEncounter.encounter?.vitals ? "Present" : "Missing",
      });

      // Extract current medications
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const currentMedications = [];
      for (const encounter of recentEncounters) {
        if (encounter.encounter?.encounterDate && new Date(encounter.encounter.encounterDate) >= threeMonthsAgo) {
          if (encounter.prescriptions) {
            for (const prescription of encounter.prescriptions) {
              if (
                prescription.medicationName &&
                prescription.medicationName !== "undefined" &&
                (prescription.status === "ISSUED" || prescription.status === "FILLED")
              ) {
                currentMedications.push({
                  name: prescription.medicationName,
                  dosage: prescription.dosage,
                  frequency: prescription.frequency,
                });
              }
            }
          }
        }
      }

      console.log(`✅ Current medications extracted: ${currentMedications.length}`);
      if (currentMedications.length > 0) {
        console.log("Sample medication:", currentMedications[0]);
      }

      // Extract chronic conditions
      const chronicConditions = [];
      for (const encounter of recentEncounters) {
        if (encounter.diagnoses) {
          for (const diagnosis of encounter.diagnoses) {
            if (diagnosis.isChronic) {
              chronicConditions.push({
                condition: diagnosis.description,
                code: diagnosis.code,
              });
            }
          }
        }
      }

      console.log(`✅ Chronic conditions found: ${chronicConditions.length}`);
      if (chronicConditions.length > 0) {
        console.log("Sample condition:", chronicConditions[0]);
      }
    }

    // Test API request structure
    console.log("\n🔍 Step 3: Expected API Request Structure");
    const expectedRequest = {
      sessionId: `clinical-analysis-${userId}-${Date.now()}`,
      message: "Tell me about this patient",
      sessionType: "clinical_analysis",
      context: {
        patientId: userId, // This should be the patient's actual userId
        userId: "doctor-user-id", // This would be the doctor's ID
        userRole: "doctor",
      },
    };

    console.log("Expected request structure:", JSON.stringify(expectedRequest, null, 2));

    // Check if there are any issues with the patient context service
    console.log("\n🔍 Step 4: Potential Issues to Check");

    console.log("✅ Patient data availability:");
    console.log(`  - Patient exists: ✅`);
    console.log(`  - Has encounters: ${recentEncounters.length > 0 ? "✅" : "❌"}`);
    console.log(`  - Has medical data: ${patient.medicalInfo ? "✅" : "❌"}`);
    console.log(`  - Role structure: ${patient.role && patient.auth?.role && patient.type ? "✅" : "⚠️"}`);

    // Check if the issue is with the medical history API's patient lookup
    console.log("\n🎯 LIKELY ISSUE IDENTIFIED:");
    if (patient.auth?.role !== "patient") {
      console.log('❌ Medical History API looks for auth.role: "patient" but this patient has:');
      console.log(`   - role: ${patient.role}`);
      console.log(`   - auth.role: ${patient.auth?.role}`);
      console.log(`   - type: ${patient.type}`);
      console.log('\n🔧 SOLUTION: Update Medical History API to also check role: "patient"');
    } else {
      console.log("✅ Patient role structure looks correct");
      console.log("🔍 The issue might be in the Clinical Analysis Service or API routing");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

debugClinicalAssistantFlow();
