#!/bin/bash

echo "Testing authentication system..."

# Test registration
echo "Testing registration..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "personalInfo": {
      "firstName": "John",
      "lastName": "Doe", 
      "dateOfBirth": "1990-01-01",
      "contact": {
        "email": "john.doe@example.com",
        "phone": "+1234567890"
      }
    },
    "medicalInfo": {
      "bloodType": "O+",
      "knownAllergies": ["None"]
    },
    "auth": {
      "password": "password123",
      "role": "patient"
    }
  }')

echo "Registration response: $RESPONSE"

# Test login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"
