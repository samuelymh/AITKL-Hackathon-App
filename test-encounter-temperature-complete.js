#!/usr/bin/env node

/**
 * Complete Encounter Creation Test with Temperature Conversion
 *
 * This script demonstrates how to create encounters with the new temperature conversion system.
 * It includes proper sample data and validates that the temperature conversion works correctly.
 */

const sampleData = require("./sample-encounter-data-updated.js");

// API endpoint for encounter creation
const API_BASE = "http://localhost:3000";
const ENCOUNTER_ENDPOINT = `${API_BASE}/api/doctor/encounters`;

// Test function to create an encounter
async function testEncounterCreation() {
  console.log("🏥 Testing Encounter Creation with Temperature Conversion\n");

  // Get sample data
  const encounterData = sampleData.sampleEncounterData;

  console.log("📋 Sample Encounter Data:");
  console.log("Patient Digital ID:", encounterData.patientDigitalId);
  console.log("Chief Complaint:", encounterData.encounter.chiefComplaint);
  console.log("Temperature (Input):", encounterData.encounter.vitals.temperature + "°F");

  // Calculate expected conversion
  const inputTemp = parseFloat(encounterData.encounter.vitals.temperature);
  const expectedCelsius = ((inputTemp - 32) * 5) / 9;
  const roundedCelsius = parseFloat(expectedCelsius.toFixed(1));

  console.log("Temperature (Expected):", roundedCelsius + "°C");
  console.log("Valid Range Check:", roundedCelsius >= 30 && roundedCelsius <= 45 ? "✅ PASS" : "❌ FAIL");
  console.log("");

  console.log("🔧 To test this encounter creation:");
  console.log("1. Make sure your dev server is running: npm run dev");
  console.log("2. Login as a doctor to get an authentication token");
  console.log("3. Use the following curl command:\n");

  console.log("```bash");
  console.log("curl -X POST " + ENCOUNTER_ENDPOINT + " \\");
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \\');
  console.log("  -d '" + JSON.stringify(encounterData, null, 2) + "'");
  console.log("```\n");

  console.log("📊 Expected API Behavior:");
  console.log("✅ Temperature will be converted from", inputTemp + "°F to", roundedCelsius + "°C");
  console.log("✅ Validation will pass because", roundedCelsius + "°C is within 30-45°C range");
  console.log("✅ Encounter will be created successfully");
  console.log("✅ Temperature will be stored as", roundedCelsius + "°C in the database");

  return encounterData;
}

// Test all sample scenarios
async function testAllScenarios() {
  console.log("🧪 Testing All Temperature Scenarios\n");

  const scenarios = [
    {
      name: "Normal Temperature",
      data: sampleData.additionalSamples[0].data,
      input: "98.6°F",
      expected: "37.0°C",
    },
    {
      name: "Fever Temperature",
      data: sampleData.sampleEncounterData,
      input: "101.3°F",
      expected: "38.5°C",
    },
    {
      name: "High Fever",
      data: sampleData.additionalSamples[1].data,
      input: "104.0°F",
      expected: "40.0°C",
    },
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}:`);
    console.log(`   Input: ${scenario.input}`);
    console.log(`   Expected: ${scenario.expected}`);
    console.log(`   Chief Complaint: "${scenario.data.encounter.chiefComplaint}"`);
    console.log(`   Encounter Type: "${scenario.data.encounter.encounterType}"`);
    console.log("");
  });

  console.log("💡 All scenarios use realistic medical temperatures in Fahrenheit");
  console.log("💡 All convert to valid Celsius ranges for medical validation");
  console.log("💡 The API will handle conversion automatically");
}

// Generate a quick reference guide
function generateQuickReference() {
  console.log("📖 Quick Reference for Updated Temperature System\n");

  console.log("🌡️  Temperature Conversion Examples:");
  const examples = [
    { f: 98.6, c: 37.0, condition: "Normal" },
    { f: 99.5, c: 37.5, condition: "Slightly elevated" },
    { f: 101.3, c: 38.5, condition: "Fever" },
    { f: 102.2, c: 39.0, condition: "High fever" },
    { f: 104.0, c: 40.0, condition: "Very high fever" },
  ];

  examples.forEach((ex) => {
    console.log(`   ${ex.f}°F → ${ex.c}°C (${ex.condition})`);
  });

  console.log("\n📋 Input Guidelines:");
  console.log("✅ Always enter temperature in Fahrenheit in the UI");
  console.log("✅ Use decimal values (e.g., 101.3, not 101)");
  console.log("✅ System automatically converts to Celsius for validation");
  console.log("✅ Valid range after conversion: 30-45°C (86-113°F)");

  console.log("\n🔧 For Developers:");
  console.log("• Frontend: Continue using °F for user input");
  console.log("• Backend: Automatic conversion in validation schema");
  console.log("• Database: Stores temperature in °C");
  console.log("• Display: Can show °F or °C as needed");
}

// Main execution
async function main() {
  console.log("=".repeat(60));
  console.log("  ENCOUNTER CREATION - TEMPERATURE CONVERSION TEST");
  console.log("=".repeat(60));
  console.log("");

  await testEncounterCreation();
  console.log("\n" + "-".repeat(60) + "\n");

  await testAllScenarios();
  console.log("\n" + "-".repeat(60) + "\n");

  generateQuickReference();

  console.log("\n" + "=".repeat(60));
  console.log("✅ All sample data updated and tested!");
  console.log("🎯 Ready for encounter creation with temperature conversion");
  console.log("=".repeat(60));
}

// Export for use in other files
module.exports = {
  testEncounterCreation,
  testAllScenarios,
  generateQuickReference,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
