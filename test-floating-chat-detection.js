// Test script to verify the floating chat URL detection logic
console.log("🔍 Testing FloatingAIChat URL Detection Logic...\n");

// Mock window object for testing
const mockWindows = [
  "http://localhost:3000/doctor",
  "http://localhost:3000/doctor/dashboard",
  "http://localhost:3000/doctor/patient/ABC123",
  "http://localhost:3000/doctor/patient/XYZ456?grantId=grant123",
  "http://localhost:3000/doctor/medical-history/ABC123",
  "http://localhost:3000/doctor/medical-history/ABC123?grantId=grant456",
  "http://localhost:3000/pharmacist",
  "http://localhost:3000/patient/dashboard",
];

// Simulate the getSessionType logic from FloatingAIChat
function testGetSessionType(url, userRole, patientId = null) {
  // Extract pathname from URL
  const urlObj = new URL(url);
  const currentPath = urlObj.pathname;

  if (userRole === "patient") return "consultation_prep";
  if (patientId) return "clinical_analysis"; // sessionType prop would override

  // For doctors with patientId, use clinical analysis
  if (userRole === "doctor" && patientId) {
    return "clinical_analysis";
  }

  // For doctors, check if we're on a patient page for clinical analysis
  if (userRole === "doctor") {
    // Check if we're on a patient page (e.g., /doctor/patient/[digitalId])
    if (currentPath.includes("/doctor/patient/") || currentPath.includes("/doctor/medical-history/")) {
      return "clinical_analysis";
    }
  }

  return "general";
}

console.log("📋 Test Results:");
console.log("=".repeat(80));

mockWindows.forEach((url) => {
  const doctorSession = testGetSessionType(url, "doctor");
  const doctorWithPatientSession = testGetSessionType(url, "doctor", "patient123");
  const patientSession = testGetSessionType(url, "patient");

  console.log(`URL: ${url}`);
  console.log(`  Doctor (no patientId): ${doctorSession}`);
  console.log(`  Doctor (with patientId): ${doctorWithPatientSession}`);
  console.log(`  Patient: ${patientSession}`);
  console.log("");
});

console.log("✅ Expected Results:");
console.log('- Doctor on /doctor/patient/* should use "clinical_analysis"');
console.log('- Doctor on /doctor/medical-history/* should use "clinical_analysis"');
console.log('- Doctor with patientId prop should always use "clinical_analysis"');
console.log('- Doctor on other pages should use "general"');
console.log('- Patients should always use "consultation_prep"');

console.log("\n🎯 Key URLs for Testing:");
console.log("1. Visit: http://localhost:3000/doctor/patient/[some-id]");
console.log("2. Open the floating chat (bottom-right circle)");
console.log('3. Check that it shows "Clinical Analysis • doctor" in the header');
console.log('4. Ask: "tell me about this patient"');
console.log("5. Should get patient-specific response, not generic advice");

console.log("\n💡 If still getting generic responses:");
console.log("- Check browser console for __AICHAT_DEBUG__ object");
console.log('- Verify sessionType is "clinical_analysis"');
console.log("- Verify context includes patientId");
console.log("- Check network tab for the API request payload");
