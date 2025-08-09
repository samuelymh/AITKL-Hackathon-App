const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function testPatientContext() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Find actual patients (users with type: "patient")
    const patients = await db
      .collection("users")
      .find({
        type: "patient",
      })
      .toArray();

    console.log("=== Patients Found ===");
    console.log('Total patients with type: "patient":', patients.length);

    if (patients.length > 0) {
      const samplePatient = patients[0];
      console.log("\nSample patient:");
      console.log("- ID:", samplePatient._id.toString());
      console.log("- Digital ID:", samplePatient.digitalIdentifier);
      console.log("- Name:", samplePatient.personalInfo?.firstName, samplePatient.personalInfo?.lastName);
      console.log("- Type:", samplePatient.type);
      console.log("- Auth Role:", samplePatient.auth?.role);

      // Check if this patient has encounters
      const encounters = await db
        .collection("encounters")
        .find({
          userId: samplePatient._id,
        })
        .toArray();

      console.log("- Encounters:", encounters.length);

      if (encounters.length > 0) {
        console.log("- Sample encounter date:", encounters[0].encounter?.encounterDate);
        console.log("- Sample chief complaint:", encounters[0].encounter?.chiefComplaint);
      }

      // Test the patient context gathering logic
      console.log("\n=== Testing Patient Context Logic ===");

      // Calculate age
      let age = 35; // default
      if (samplePatient.personalInfo?.dateOfBirth) {
        const birthDate = new Date(samplePatient.personalInfo.dateOfBirth);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (age <= 0 || age > 150) age = 35;
        }
      }
      console.log("- Calculated age:", age);

      // Process allergies
      const allergies = { drug: [], food: [], environmental: [] };
      if (samplePatient.medicalInfo?.knownAllergies && Array.isArray(samplePatient.medicalInfo.knownAllergies)) {
        for (const allergy of samplePatient.medicalInfo.knownAllergies) {
          if (typeof allergy === "string") {
            allergies.drug.push(allergy); // Just categorize as drug for now
          }
        }
      }
      console.log("- Allergies:", allergies);

      // Process encounters for medications and chronic conditions
      const currentMedications = [];
      const chronicConditions = [];

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      for (const encounter of encounters) {
        if (encounter.encounter?.encounterDate && new Date(encounter.encounter.encounterDate) >= threeMonthsAgo) {
          // Extract medications
          if (encounter.prescriptions) {
            for (const prescription of encounter.prescriptions) {
              if (
                prescription.medicationName &&
                prescription.medicationName !== "undefined" &&
                (prescription.status === "ISSUED" || prescription.status === "FILLED")
              ) {
                currentMedications.push({
                  name: prescription.medicationName,
                  dosage: prescription.dosage || "Unknown dosage",
                  frequency: prescription.frequency || "As prescribed",
                });
              }
            }
          }
        }

        // Extract chronic conditions
        if (encounter.diagnoses) {
          for (const diagnosis of encounter.diagnoses) {
            if (diagnosis.isChronic) {
              chronicConditions.push({
                condition: diagnosis.description,
                code: diagnosis.code,
                status: "active",
              });
            }
          }
        }
      }

      console.log("- Current medications:", currentMedications.length);
      if (currentMedications.length > 0) {
        console.log("  Sample medication:", currentMedications[0]);
      }

      console.log("- Chronic conditions:", chronicConditions.length);
      if (chronicConditions.length > 0) {
        console.log("  Sample condition:", chronicConditions[0]);
      }

      // Risk factors
      const riskFactors = [];
      if (age >= 65) riskFactors.push("Advanced age (65+)");
      if (samplePatient.medicalInfo?.smokingStatus === "current") riskFactors.push("Current smoker");
      console.log("- Risk factors:", riskFactors);

      console.log("\n✅ Patient context would be available for AI analysis");
    } else {
      console.log('\n❌ No patients found with type: "patient"');

      // Check if there are users with auth.role: "patient"
      const authPatients = await db
        .collection("users")
        .find({
          "auth.role": "patient",
        })
        .toArray();

      console.log('Users with auth.role: "patient":', authPatients.length);
      if (authPatients.length > 0) {
        console.log("Sample auth patient:", {
          id: authPatients[0]._id.toString(),
          digitalId: authPatients[0].digitalIdentifier,
          type: authPatients[0].type,
          authRole: authPatients[0].auth?.role,
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

testPatientContext();
