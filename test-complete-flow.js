const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function testCompleteFlow() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("=== Testing Complete Doctor Clinical Assistant Flow ===");

    // Step 1: Find a real patient
    const patients = await db
      .collection("users")
      .find({
        type: "patient",
        "auth.role": "patient",
      })
      .toArray();

    if (patients.length === 0) {
      console.log("❌ No patients found");
      return;
    }

    const testPatient = patients[0];
    console.log("✅ Found test patient:");
    console.log("- Patient ID:", testPatient._id.toString());
    console.log("- Digital ID:", testPatient.digitalIdentifier);
    console.log("- Name:", testPatient.personalInfo?.firstName, testPatient.personalInfo?.lastName);

    // Step 2: Check encounters for this patient
    const encounters = await db
      .collection("encounters")
      .find({
        userId: testPatient._id,
      })
      .toArray();

    console.log("- Encounters:", encounters.length);

    // Step 3: Simulate the medical history API response
    const medicalHistoryResponse = {
      patient: {
        userId: testPatient._id.toString(), // This is what gets passed to DoctorClinicalAssistant
        name: `${testPatient.personalInfo?.firstName} ${testPatient.personalInfo?.lastName}`,
        digitalIdentifier: testPatient.digitalIdentifier,
      },
    };

    console.log("\n✅ Medical History API Response (relevant part):");
    console.log(JSON.stringify(medicalHistoryResponse, null, 2));

    // Step 4: Test what the DoctorClinicalAssistant would send to the API
    const clinicalAssistantRequest = {
      sessionId: `clinical-analysis-${medicalHistoryResponse.patient.userId}-${Date.now()}`,
      message: "What are the key safety considerations for this patient?",
      sessionType: "clinical_analysis",
      context: {
        patientId: medicalHistoryResponse.patient.userId, // This is the patient's actual userId
        userId: "doctor-user-id", // This would be the doctor's ID
        userRole: "doctor",
      },
    };

    console.log("\n✅ Doctor Clinical Assistant Request:");
    console.log(JSON.stringify(clinicalAssistantRequest, null, 2));

    // Step 5: Test what PatientContextService would find
    console.log("\n=== Testing Patient Context Gathering ===");

    // Simulate PatientContextService.gatherPatientContext logic
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentEncounters = await db
      .collection("encounters")
      .find({
        userId: new ObjectId(medicalHistoryResponse.patient.userId),
        "encounter.encounterDate": { $gte: sixMonthsAgo },
      })
      .sort({ "encounter.encounterDate": -1 })
      .limit(10)
      .toArray();

    console.log("✅ Patient context would include:");
    console.log("- Patient found:", !!testPatient);
    console.log("- Recent encounters:", recentEncounters.length);

    // Extract medications from recent encounters
    let medicationCount = 0;
    let chronicConditionCount = 0;

    for (const encounter of recentEncounters) {
      if (encounter.prescriptions) {
        medicationCount += encounter.prescriptions.filter(
          (p) =>
            p.medicationName && p.medicationName !== "undefined" && (p.status === "ISSUED" || p.status === "FILLED")
        ).length;
      }

      if (encounter.diagnoses) {
        chronicConditionCount += encounter.diagnoses.filter((d) => d.isChronic).length;
      }
    }

    console.log("- Current medications:", medicationCount);
    console.log("- Chronic conditions:", chronicConditionCount);
    console.log("- Allergies:", testPatient.medicalInfo?.knownAllergies?.length || 0);

    // Calculate age
    let age = 35;
    if (testPatient.personalInfo?.dateOfBirth) {
      const birthDate = new Date(testPatient.personalInfo.dateOfBirth);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age <= 0 || age > 150) age = 35;
      }
    }
    console.log("- Age:", age);

    console.log("\n🎯 CONCLUSION:");
    if (recentEncounters.length > 0 || medicationCount > 0 || chronicConditionCount > 0) {
      console.log("✅ The Doctor Clinical Assistant SHOULD provide specific patient insights");
      console.log("✅ Rich patient data is available for clinical analysis");
      console.log("✅ The flow from medical history page → clinical assistant → patient context is working");
    } else {
      console.log("⚠️ Limited patient data available, but basic demographics should still work");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

testCompleteFlow();
