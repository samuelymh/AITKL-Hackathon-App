const testRegistration = async () => {
  const registrationData = {
    personalInfo: {
      firstName: "Test",
      lastName: "User",
      dateOfBirth: "1990-01-01",
      contact: {
        email: "testuser@example.com",
        phone: "+1234567890",
      },
    },
    medicalInfo: {
      bloodType: "O+",
      knownAllergies: ["None"],
    },
    auth: {
      password: "securepassword123",
      role: "patient",
    },
  };

  try {
    const response = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    });

    const result = await response.json();
    console.log("Registration result:", result);

    if (result.success) {
      console.log("Registration successful! Testing login...");

      // Test login
      const loginResponse = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "testuser@example.com",
          password: "securepassword123",
        }),
      });

      const loginResult = await loginResponse.json();
      console.log("Login result:", loginResult);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
};

testRegistration();
