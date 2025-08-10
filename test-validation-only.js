// Standalone validation test for patient registration
const { z } = require("zod");

// Copy the registration schema from the API route (updated version)
const baseUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  emergencyContact: z.object({
    name: z.string().min(1, "Emergency contact name is required"),
    phone: z.string().min(1, "Emergency contact phone is required"),
    relationship: z.string().min(1, "Emergency contact relationship is required"),
  }),
});

const patientSchema = baseUserSchema.extend({
  role: z.literal("patient"),
});

const doctorSchema = baseUserSchema.extend({
  role: z.literal("doctor"),
  licenseNumber: z.string().min(1, "License number is required"),
  specialty: z.string().min(1, "Specialty is required"),
});

const pharmacistSchema = baseUserSchema.extend({
  role: z.literal("pharmacist"),
  licenseNumber: z.string().min(1, "License number is required"),
  specialty: z.string().min(1, "Specialty is required"),
});

const registrationSchema = z.discriminatedUnion("role", [patientSchema, doctorSchema, pharmacistSchema]);

// Test data
const patientData = {
  name: "John Doe",
  email: "john.doe@email.com",
  password: "password123",
  phone: "+1234567890",
  dateOfBirth: "1990-01-01",
  emergencyContact: {
    name: "Jane Doe",
    phone: "+0987654321",
    relationship: "spouse",
  },
  role: "patient",
};

const doctorData = {
  ...patientData,
  role: "doctor",
  licenseNumber: "DOC123456",
  specialty: "General Medicine",
};

const doctorDataMissingLicense = {
  ...patientData,
  role: "doctor",
  // Missing licenseNumber and specialty
};

// Also test the old problematic case - patient data with professional info
const patientDataWithProfessionalInfo = {
  ...patientData,
  licenseNumber: "SHOULD_BE_IGNORED",
  specialty: "SHOULD_BE_IGNORED",
};

console.log("🧪 Testing Patient Registration Validation...\n");

// Test 1: Patient data (should pass)
console.log("Test 1: Patient without professional info");
try {
  const result = registrationSchema.parse(patientData);
  console.log("✅ PASSED - Patient registration validation successful");
  console.log("   Patient data is valid without professional info\n");
} catch (error) {
  console.log("❌ FAILED - Patient registration validation failed");
  console.log("   Error:", error.issues?.[0]?.message || error.message);
  console.log("   This suggests the fix did not work!\n");
}

// Test 2: Patient data with extra professional info (should still pass, extra fields ignored)
console.log("Test 2: Patient with extra professional info fields");
try {
  const result = registrationSchema.parse(patientDataWithProfessionalInfo);
  console.log("✅ PASSED - Patient registration with extra fields successful");
  console.log("   Extra professional info fields are ignored for patients\n");
} catch (error) {
  console.log("❌ FAILED - Patient registration with extra fields failed");
  console.log("   Error:", error.issues?.[0]?.message || error.message);
  console.log("   This suggests the validation is too strict!\n");
}

// Test 3: Doctor data with professional info (should pass)
console.log("Test 3: Doctor with professional info");
try {
  const result = registrationSchema.parse(doctorData);
  console.log("✅ PASSED - Doctor registration validation successful");
  console.log("   Doctor data is valid with professional info\n");
} catch (error) {
  console.log("❌ FAILED - Doctor registration validation failed");
  console.log("   Error:", error.issues?.[0]?.message || error.message);
  console.log("   This suggests something is wrong with doctor validation!\n");
}

// Test 4: Doctor data without professional info (should fail)
console.log("Test 4: Doctor without professional info");
try {
  const result = registrationSchema.parse(doctorDataMissingLicense);
  console.log("❌ FAILED - Doctor validation should have failed but passed");
  console.log("   Missing professional info was not caught!\n");
} catch (error) {
  console.log("✅ PASSED - Doctor registration correctly failed without professional info");
  console.log("   Error:", error.issues?.[0]?.message || error.message);
  console.log("   This is the expected behavior\n");
}

console.log("🎯 Summary:");
console.log("- Patients should be able to register without professional info");
console.log("- Doctors/Pharmacists should be required to provide professional info");
console.log("- The fix addresses the original issue where patients failed due to missing licenseNumber/specialty");
console.log("\n✨ If Tests 1, 2, and 3 passed and Test 4 failed as expected, the fix is working!");
