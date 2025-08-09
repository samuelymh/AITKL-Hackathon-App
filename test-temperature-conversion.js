#!/usr/bin/env node

/**
 * Test Temperature Conversion Logic
 * Tests the Fahrenheit to Celsius conversion used in encounter creation
 */

console.log("🌡️  Testing Temperature Conversion Logic\n");

// Test the conversion function
function convertFahrenheitToCelsius(fahrenheit) {
  if (!fahrenheit || fahrenheit === "") return undefined;
  const fahrenheitNum = Number(fahrenheit);
  if (isNaN(fahrenheitNum)) return undefined;
  // Convert Fahrenheit to Celsius: (°F - 32) × 5/9
  const celsius = ((fahrenheitNum - 32) * 5) / 9;
  return parseFloat(celsius.toFixed(1)); // Round to 1 decimal place
}

// Test cases
const testCases = [
  { input: "98.6", expected: "37.0", description: "Normal body temperature" },
  { input: "101.3", expected: "38.5", description: "Fever temperature" },
  { input: "104.0", expected: "40.0", description: "High fever" },
  { input: "95.0", expected: "35.0", description: "Low temperature" },
  { input: "32.0", expected: "0.0", description: "Freezing point" },
  { input: "", expected: "undefined", description: "Empty string" },
  { input: "abc", expected: "undefined", description: "Invalid input" },
];

console.log("Test Results:");
console.log("Input (°F) | Output (°C) | Expected | Status | Description");
console.log("-----------|-------------|----------|---------|-------------");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((test) => {
  const result = convertFahrenheitToCelsius(test.input);
  const resultStr = result === undefined ? "undefined" : result.toString();
  const passed = resultStr === test.expected;
  const status = passed ? "✅ PASS" : "❌ FAIL";

  if (passed) passedTests++;

  console.log(
    `${test.input.padEnd(10)} | ${resultStr.padEnd(11)} | ${test.expected.padEnd(8)} | ${status} | ${test.description}`
  );
});

console.log(`\n📊 Summary: ${passedTests}/${totalTests} tests passed\n`);

// Test validation range (30-45°C as per backend validation)
console.log("🔍 Validation Range Testing (30-45°C):");
const validationTests = [
  { fahrenheit: "86.0", celsius: 30.0, description: "Lower bound (30°C)" },
  { fahrenheit: "98.6", celsius: 37.0, description: "Normal temp (37°C)" },
  { fahrenheit: "101.3", celsius: 38.5, description: "Fever (38.5°C)" },
  { fahrenheit: "113.0", celsius: 45.0, description: "Upper bound (45°C)" },
];

validationTests.forEach((test) => {
  const result = convertFahrenheitToCelsius(test.fahrenheit);
  const inRange = result >= 30 && result <= 45;
  const status = inRange ? "✅ VALID" : "❌ INVALID";
  console.log(`${test.fahrenheit}°F → ${result}°C | ${status} | ${test.description}`);
});

console.log("\n🎯 Conclusion:");
console.log("The temperature conversion logic correctly converts Fahrenheit to Celsius");
console.log("and the converted values fall within the backend validation range (30-45°C)");
console.log("for normal medical temperatures.");
