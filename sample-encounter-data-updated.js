#!/usr/bin/env node

/**
 * Sample Encounter Data - Updated for Temperature Conversion
 *
 * This file contains updated sample encounter data that works with the new
 * Fahrenheit to Celsius temperature conversion system.
 */

// Updated sample encounter data with Fahrenheit temperatures
const sampleEncounterData = {
  // Basic encounter information
  patientDigitalId: "HID_6c46e5e6-2373-4785-815f-373c7c474d36",

  encounter: {
    chiefComplaint: "Patient reports fever and headache for 3 days",
    encounterType: "Initial Consultation", // Will be converted to "CONSULTATION"
    encounterDate: "2024-12-12T14:30:00.000Z",

    // Separate fields that get combined into notes
    historyOfPresentIllness:
      "Patient has had fever for 3 days with associated headache, fatigue, and body aches. No nausea or vomiting. Appetite decreased.",
    physicalExamination:
      "Patient appears mildly ill but alert and oriented. Temperature elevated at 101.3°F. No neck stiffness. Throat slightly erythematous.",
    assessmentAndPlan:
      "Probable viral syndrome. Symptomatic treatment with rest, fluids, and acetaminophen. Return if symptoms worsen or persist beyond 7 days.",

    // Vitals in US units (will be converted as needed)
    vitals: {
      temperature: "101.3", // Fahrenheit - will be converted to 38.5°C
      heartRate: "88",
      bloodPressure: "125/82",
      oxygenSaturation: "97",
      weight: "165", // pounds
      height: "68", // inches (5'8")
    },
  },

  // Diagnoses
  diagnoses: [
    {
      code: "R50.9",
      description: "Fever, unspecified",
      notes: "Probable viral fever based on presentation",
      isChronic: false,
    },
    {
      code: "R51",
      description: "Headache",
      notes: "Associated with fever, likely viral in origin",
      isChronic: false,
    },
  ],

  // Prescriptions
  prescriptions: [
    {
      medicationName: "Acetaminophen",
      dosage: "650mg",
      frequency: "Every 6 hours as needed",
      duration: "7 days",
      notes: "For fever and pain relief. Do not exceed 4g in 24 hours",
    },
  ],
};

// Additional sample encounters with different temperature scenarios
const additionalSamples = [
  {
    description: "Normal checkup with normal temperature",
    data: {
      patientDigitalId: "HID_6c46e5e6-2373-4785-815f-373c7c474d36",
      encounter: {
        chiefComplaint: "Annual physical examination",
        encounterType: "Annual Physical",
        encounterDate: "2024-12-15T10:00:00.000Z",
        historyOfPresentIllness: "Patient here for routine annual physical. No acute complaints.",
        physicalExamination: "Well-appearing adult in no acute distress. All systems within normal limits.",
        assessmentAndPlan:
          "Continue current health maintenance. Labs within normal limits. Next annual physical in 12 months.",
        vitals: {
          temperature: "98.6", // Normal temp - converts to 37.0°C
          heartRate: "72",
          bloodPressure: "118/76",
          oxygenSaturation: "99",
          weight: "160",
          height: "68",
        },
      },
      diagnoses: [
        {
          code: "Z00.00",
          description: "Encounter for general adult medical examination without abnormal findings",
          notes: "Annual physical examination",
          isChronic: false,
        },
      ],
    },
  },

  {
    description: "High fever emergency visit",
    data: {
      patientDigitalId: "HID_6c46e5e6-2373-4785-815f-373c7c474d36",
      encounter: {
        chiefComplaint: "High fever and difficulty breathing",
        encounterType: "Emergency Visit",
        encounterDate: "2024-12-16T22:30:00.000Z",
        historyOfPresentIllness:
          "Patient developed high fever to 104°F with shortness of breath and chest tightness over the past 6 hours.",
        physicalExamination:
          "Patient appears acutely ill. High fever, tachypneic, using accessory muscles. Crackles in bilateral lower lobes.",
        assessmentAndPlan:
          "Pneumonia suspected. Chest X-ray ordered. Start antibiotics. Monitor oxygen saturation closely.",
        vitals: {
          temperature: "104.0", // High fever - converts to 40.0°C
          heartRate: "110",
          bloodPressure: "140/90",
          oxygenSaturation: "92",
          weight: "165",
          height: "68",
        },
      },
      diagnoses: [
        {
          code: "J18.9",
          description: "Pneumonia, unspecified organism",
          notes: "Community-acquired pneumonia based on clinical presentation",
          isChronic: false,
        },
      ],
      prescriptions: [
        {
          medicationName: "Azithromycin",
          dosage: "500mg",
          frequency: "Once daily",
          duration: "5 days",
          notes: "For community-acquired pneumonia",
        },
      ],
    },
  },
];

// Function to test temperature conversion
function testTemperatureConversion() {
  console.log("🌡️  Testing Temperature Values in Sample Data\n");

  const allSamples = [
    { name: "Primary Sample", data: sampleEncounterData },
    ...additionalSamples.map((s) => ({ name: s.description, data: s.data })),
  ];

  allSamples.forEach((sample) => {
    const temp = sample.data.encounter.vitals?.temperature;
    if (temp) {
      const fahrenheit = parseFloat(temp);
      const celsius = ((fahrenheit - 32) * 5) / 9;
      const rounded = parseFloat(celsius.toFixed(1));

      console.log(`${sample.name}:`);
      console.log(`  Input: ${temp}°F`);
      console.log(`  Converted: ${rounded}°C`);
      console.log(`  Valid Range: ${rounded >= 30 && rounded <= 45 ? "✅ YES" : "❌ NO"}`);
      console.log("");
    }
  });
}

// Export for use in other files
module.exports = {
  sampleEncounterData,
  additionalSamples,
  testTemperatureConversion,
};

// Run test if called directly
if (require.main === module) {
  console.log("📋 Updated Sample Encounter Data\n");
  console.log("This sample data has been updated to work with the new temperature conversion system.");
  console.log("All temperatures are provided in Fahrenheit and will be automatically converted to Celsius.\n");

  testTemperatureConversion();

  console.log("💡 Usage Instructions:");
  console.log("1. Copy any of the sample data above");
  console.log("2. Use it in API calls to /api/doctor/encounters");
  console.log("3. Temperature values will be automatically converted from °F to °C");
  console.log("4. All sample temperatures are within the valid medical range (30-45°C after conversion)");
}
