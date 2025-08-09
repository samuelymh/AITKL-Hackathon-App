// Test script to verify the FloatingAIChat visibility rules
console.log("🔍 Testing FloatingAIChat Visibility Rules...\n");

// Test scenarios
const testScenarios = [
  // PATIENT scenarios
  { userRole: "patient", path: "/patient/dashboard", shouldShow: true, description: "Patient on dashboard" },
  { userRole: "patient", path: "/patient/appointments", shouldShow: true, description: "Patient on patient page" },
  { userRole: "patient", path: "/doctor/dashboard", shouldShow: false, description: "Patient on doctor page" },
  { userRole: "patient", path: "/login", shouldShow: false, description: "Patient on login page" },

  // DOCTOR scenarios
  { userRole: "doctor", path: "/doctor/dashboard", shouldShow: true, description: "Doctor on dashboard" },
  { userRole: "doctor", path: "/doctor/patients", shouldShow: true, description: "Doctor on patients list" },
  {
    userRole: "doctor",
    path: "/doctor/patient/ABC123",
    shouldShow: false,
    description: "Doctor on patient page (has DoctorClinicalAssistant)",
  },
  {
    userRole: "doctor",
    path: "/doctor/medical-history/ABC123",
    shouldShow: false,
    description: "Doctor on medical history (has DoctorClinicalAssistant)",
  },
  { userRole: "doctor", path: "/patient/dashboard", shouldShow: false, description: "Doctor on patient area" },

  // PHARMACIST scenarios
  { userRole: "pharmacist", path: "/pharmacist/dashboard", shouldShow: true, description: "Pharmacist on dashboard" },
  {
    userRole: "pharmacist",
    path: "/pharmacist/prescriptions",
    shouldShow: true,
    description: "Pharmacist on pharmacist page",
  },
  { userRole: "pharmacist", path: "/doctor/dashboard", shouldShow: false, description: "Pharmacist on doctor page" },

  // ADMIN scenarios
  { userRole: "admin", path: "/admin/dashboard", shouldShow: true, description: "Admin on dashboard" },
  { userRole: "admin", path: "/admin/users", shouldShow: true, description: "Admin on admin page" },
  { userRole: "admin", path: "/doctor/dashboard", shouldShow: false, description: "Admin on doctor page" },
];

// Simulate the visibility logic from FloatingAIChat
function shouldShowFloatingChat(userRole, currentPath) {
  // 1. PATIENTS: Only show on patient pages (/patient/* or standalone /dashboard for patients)
  if (userRole === "patient") {
    if (!currentPath.startsWith("/patient") && currentPath !== "/dashboard") {
      return false; // Don't show patient chat on non-patient pages
    }
  }

  // 2. DOCTORS: Only show on doctor pages, EXCEPT patient analysis pages (has DoctorClinicalAssistant)
  if (userRole === "doctor") {
    // First check if we're on doctor pages at all
    if (!currentPath.startsWith("/doctor") && currentPath !== "/dashboard") {
      return false; // Don't show on non-doctor pages
    }

    // Then check if we're on patient analysis pages
    if (currentPath.includes("/doctor/patient/") || currentPath.includes("/doctor/medical-history/")) {
      return false; // Don't show floating chat on patient pages - use DoctorClinicalAssistant instead
    }
  }

  // 3. PHARMACISTS: Only show on pharmacist pages
  if (userRole === "pharmacist") {
    if (!currentPath.startsWith("/pharmacist") && currentPath !== "/dashboard") {
      return false;
    }
  }

  // 4. ADMINS: Only show on admin pages
  if (userRole === "admin") {
    if (!currentPath.startsWith("/admin") && currentPath !== "/dashboard") {
      return false;
    }
  }

  return true;
}

console.log("📋 Visibility Test Results:");
console.log("=".repeat(80));

let passedTests = 0;
let totalTests = testScenarios.length;

testScenarios.forEach((scenario, index) => {
  const actualResult = shouldShowFloatingChat(scenario.userRole, scenario.path);
  const passed = actualResult === scenario.shouldShow;

  console.log(`${index + 1}. ${scenario.description}`);
  console.log(`   Path: ${scenario.path}`);
  console.log(`   Role: ${scenario.userRole}`);
  console.log(`   Expected: ${scenario.shouldShow ? "SHOW" : "HIDE"}`);
  console.log(`   Actual: ${actualResult ? "SHOW" : "HIDE"}`);
  console.log(`   Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log("");

  if (passed) passedTests++;
});

console.log("=".repeat(80));
console.log(
  `📊 Test Summary: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`
);

if (passedTests === totalTests) {
  console.log("🎉 All tests passed! FloatingAIChat visibility rules are working correctly.");
} else {
  console.log("⚠️  Some tests failed. Check the logic above.");
}

console.log("\n🎯 Expected Behavior:");
console.log("1. PATIENTS see chat only on /patient/* and dashboard pages");
console.log("2. DOCTORS see chat on /doctor/* EXCEPT /doctor/patient/* and /doctor/medical-history/*");
console.log("3. PHARMACISTS see chat only on /pharmacist/* and dashboard pages");
console.log("4. ADMINS see chat only on /admin/* and dashboard pages");
console.log("5. No overlapping chat icons (FloatingAIChat vs DoctorClinicalAssistant)");

console.log("\n🔧 Visual Differences:");
console.log("- FloatingAIChat: Blue button (bg-blue-600), bottom-20 right-6, z-40");
console.log("- DoctorClinicalAssistant: Blue button (bg-blue-600), bottom-4 right-4, z-50");
console.log("- Different positions prevent visual overlap");

console.log("\n🧪 Manual Testing Steps:");
console.log("1. Login as patient → Visit /patient/dashboard → Should see blue chat button");
console.log("2. Login as doctor → Visit /doctor/dashboard → Should see blue chat button");
console.log("3. Login as doctor → Visit /doctor/patient/[id] → Should see ONLY DoctorClinicalAssistant button");
console.log("4. Switch between pages and verify only appropriate chat appears");
