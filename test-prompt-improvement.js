// Simple test to verify the clinical analysis prompt improvement
console.log("🔍 Testing Clinical Analysis Prompt Improvement...\n");

// Mock patient context (matching the real data structure)
const mockPatientContext = {
  demographics: {
    age: 35,
    bloodType: "O+",
    smokingStatus: "never",
  },
  allergies: {
    drug: ["Penicillin"],
    food: [],
    environmental: [],
  },
  chronicConditions: [
    {
      condition: "Type 2 Diabetes",
      diagnosedDate: new Date("2020-01-01"),
      icd10Code: "E11.9",
      status: "active",
    },
    {
      condition: "Hypertension",
      diagnosedDate: new Date("2021-06-15"),
      icd10Code: "I10",
      status: "active",
    },
  ],
  recentEncounters: [
    {
      date: new Date("2024-12-01"),
      type: "routine_checkup",
      chiefComplaint: "Routine diabetes follow-up",
      diagnosis: ["Type 2 Diabetes - well controlled", "Hypertension - stable"],
      prescriptions: ["Metformin 500mg", "Lisinopril 10mg"],
    },
    {
      date: new Date("2024-11-15"),
      type: "urgent_care",
      chiefComplaint: "Upper respiratory infection",
      diagnosis: ["Viral upper respiratory infection"],
      prescriptions: ["Supportive care recommended"],
    },
  ],
  currentMedications: [
    {
      name: "Metformin",
      dosage: "500mg",
      frequency: "twice daily",
      prescribedDate: new Date("2024-12-01"),
    },
    {
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "once daily",
      prescribedDate: new Date("2024-12-01"),
    },
  ],
  latestVitals: {
    bloodPressure: "135/85",
    heartRate: 78,
    temperature: "98.6", // Normal temperature in Fahrenheit
    weight: 82,
    height: 175,
    oxygenSaturation: 96,
  },
  riskFactors: ["Type 2 Diabetes", "Hypertension", "Family history of cardiovascular disease"],
};

// Test message
const testMessage = "What are the key clinical considerations for this patient's next visit?";

// Build the clinical analysis prompt (recreating the method logic)
function buildTestClinicalAnalysisPrompt(patientContext, message) {
  console.log("🏥 Building clinical analysis prompt for doctor", {
    patientAge: patientContext.demographics?.age,
    chronicConditions: patientContext.chronicConditions?.length || 0,
    currentMedications: patientContext.currentMedications?.length || 0,
    recentEncounters: patientContext.recentEncounters?.length || 0,
  });

  return `You are an experienced Clinical AI Assistant helping a doctor analyze a specific patient's case.

## PATIENT OVERVIEW
This ${patientContext.demographics?.age || "adult"} year old patient has the following medical profile:

**Medical History:**
${
  patientContext.chronicConditions?.length > 0
    ? patientContext.chronicConditions
        .map((c) => `• ${c.condition} (diagnosed ${new Date(c.diagnosedDate).getFullYear()}) - ${c.status}`)
        .join("\n")
    : "• No chronic conditions documented"
}

**Current Medications:**
${
  patientContext.currentMedications?.length > 0
    ? patientContext.currentMedications
        .map(
          (m) => `• ${m.name} ${m.dosage} - ${m.frequency} (started ${new Date(m.prescribedDate).toLocaleDateString()})`
        )
        .join("\n")
    : "• No current medications documented"
}

**Known Allergies:**
${
  [...(patientContext.allergies?.drug || []), ...(patientContext.allergies?.food || [])].length > 0
    ? [...(patientContext.allergies.drug || []), ...(patientContext.allergies.food || [])]
        .map((a) => `• ${a}`)
        .join("\n")
    : "• No documented allergies"
}

**Recent Clinical Encounters:**
${
  patientContext.recentEncounters?.length > 0
    ? patientContext.recentEncounters
        .slice(0, 3)
        .map(
          (e) =>
            `• ${new Date(e.date).toLocaleDateString()}: ${e.type} - "${e.chiefComplaint}"
      Diagnosis: ${Array.isArray(e.diagnosis) ? e.diagnosis.join(", ") : e.diagnosis || "Not specified"}`
        )
        .join("\n")
    : "• No recent encounters documented"
}

**Latest Vitals:**
${
  patientContext.latestVitals
    ? `• Blood Pressure: ${patientContext.latestVitals.bloodPressure || "Not recorded"}
• Heart Rate: ${patientContext.latestVitals.heartRate || "Not recorded"} bpm
• Temperature: ${patientContext.latestVitals.temperature || "Not recorded"}°F
• Oxygen Saturation: ${patientContext.latestVitals.oxygenSaturation || "Not recorded"}%
• Weight: ${patientContext.latestVitals.weight || "Not recorded"} kg
• Height: ${patientContext.latestVitals.height || "Not recorded"} cm`
    : "• No recent vitals available"
}

## DOCTOR'S QUESTION
"${message}"

## YOUR RESPONSE INSTRUCTIONS

Based on this patient's complete medical history above, provide a comprehensive clinical analysis that:

1. **References specific patient data** - Use the actual conditions, medications, and history shown above
2. **Identifies clinical patterns** - Connect the dots between their conditions, medications, and recent visits
3. **Highlights safety concerns** - Point out any drug interactions, contraindications, or red flags specific to this patient
4. **Suggests actionable next steps** - Based on their actual medical profile and recent encounters
5. **Addresses care gaps** - What might be missing based on their conditions and age

**Important:** Your response must be specific to THIS patient's medical data. Reference their actual conditions, medications, encounter history, and vitals. Do not provide generic advice.

Focus on actionable clinical insights that help the doctor make informed decisions about this specific patient's care.`;
}

console.log("📋 Test Parameters:");
console.log("- Patient Age:", mockPatientContext.demographics.age);
console.log("- Chronic Conditions:", mockPatientContext.chronicConditions.length);
console.log("- Current Medications:", mockPatientContext.currentMedications.length);
console.log("- Recent Encounters:", mockPatientContext.recentEncounters.length);
console.log("- Test Message:", testMessage);
console.log("");

const clinicalPrompt = buildTestClinicalAnalysisPrompt(mockPatientContext, testMessage);

console.log("📝 Generated Clinical Analysis Prompt:");
console.log("=".repeat(100));
console.log(clinicalPrompt);
console.log("=".repeat(100));

console.log("\n🎯 Prompt Analysis:");
console.log("- Prompt Length:", clinicalPrompt.length, "characters");
console.log("- Contains Patient Age:", clinicalPrompt.includes("35 year old"));
console.log("- Contains Diabetes:", clinicalPrompt.includes("Type 2 Diabetes"));
console.log("- Contains Metformin:", clinicalPrompt.includes("Metformin"));
console.log("- Contains Blood Pressure:", clinicalPrompt.includes("135/85"));
console.log("- Contains Recent Visit:", clinicalPrompt.includes("12/1/2024"));

// Check for patient-specific elements
const patientSpecificElements = [
  "35 year old",
  "Type 2 Diabetes",
  "Hypertension",
  "Metformin 500mg",
  "Lisinopril 10mg",
  "Penicillin",
  "routine diabetes follow-up",
  "135/85",
  "twice daily",
];

const foundElements = patientSpecificElements.filter((element) =>
  clinicalPrompt.toLowerCase().includes(element.toLowerCase())
);

console.log("\n✅ Patient-Specific Elements Found:", foundElements.length, "/", patientSpecificElements.length);
foundElements.forEach((element) => console.log("  ✓", element));

const missingElements = patientSpecificElements.filter(
  (element) => !clinicalPrompt.toLowerCase().includes(element.toLowerCase())
);

if (missingElements.length > 0) {
  console.log("\n❌ Missing Elements:");
  missingElements.forEach((element) => console.log("  ✗", element));
} else {
  console.log("\n🎉 ALL patient-specific elements are included in the prompt!");
}

console.log("\n💡 This prompt should generate a highly patient-specific response that references:");
console.log("- The patient's exact age (35)");
console.log("- Their specific conditions (Diabetes, Hypertension)");
console.log("- Their exact medications (Metformin 500mg, Lisinopril 10mg)");
console.log("- Their recent visit details");
console.log("- Their latest vitals");
console.log("- Their allergy to Penicillin");

console.log("\n🚀 The improved prompt is ready! Test it by visiting the Doctor Dashboard and asking about a patient.");
