# QR Code Access Grant System - Corrected Implementation

## Overview

This document explains how the QR code access grant system has been corrected to align with the knowledge base specification and proper healthcare workflow.

## 🚨 Key Changes Made

### **Previous Implementation (Incorrect)**
- QR codes contained **authorization grant data** (grantId, userId, organizationId, etc.)
- Required **pre-existing grants** before QR code generation
- **Backwards flow**: Grant → QR Code → Scan
- **Security risk**: Exposed internal system data in QR codes

### **Corrected Implementation (Knowledge Base Aligned)**
- QR codes contain **only patient's digital identifier** (`digitalIdentifier`)
- **No pre-existing grants** required
- **Correct flow**: QR Scan → Authorization Request → Patient Approval → Grant
- **Security focused**: Only public identifier in QR code

## 🔄 Correct Authorization Flow

### 1. Patient Preparation
```typescript
// Patient gets their QR code containing only their digital identifier
GET /api/patient/qr
// Returns QR code with:
{
  "type": "health_access_request", 
  "digitalIdentifier": "HID_a1b2c3d4-...",
  "version": "1.0",
  "timestamp": "2025-08-03T10:30:00Z"
}
```

### 2. Healthcare Facility Visit
1. **Patient arrives** at clinic/hospital with QR code displayed in their app
2. **Front desk scans** QR code to extract `digitalIdentifier`
3. **System validates** QR code format and extracts identifier

### 3. Authorization Request Creation
```typescript
// Healthcare provider creates authorization request
POST /api/v1/authorizations/request
{
  "scannedQRData": "{"type":"health_access_request",...}",
  "organizationId": "clinic_id",
  "requestingPractitionerId": "doctor_id", // optional
  "accessScope": {
    "canViewMedicalHistory": true,
    "canViewPrescriptions": true,
    "canCreateEncounters": false,
    "canViewAuditLogs": false
  },
  "timeWindowHours": 24
}
```

### 4. Patient Notification & Approval
1. **Push notification** sent to patient's mobile app
2. **Patient reviews** request details:
   - Organization name and type
   - Requesting practitioner (if specified)
   - Access scope permissions
   - Time window duration
3. **Patient approves/denies** the request

### 5. Grant Activation
- If approved: Grant status changes from `PENDING` → `ACTIVE`
- If denied: Grant status changes to `REVOKED`
- Healthcare provider receives real-time confirmation

### 6. Authorized Access
- Healthcare provider can now access patient records within the approved scope
- All access is logged and audited
- Grant automatically expires after the time window

## 🔐 Security Improvements

### QR Code Content (New)
```json
{
  "type": "health_access_request",
  "digitalIdentifier": "HID_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": "1.0", 
  "timestamp": "2025-08-03T10:30:00Z"
}
```

**Benefits:**
- ✅ No sensitive internal data exposed
- ✅ Patient identifier is designed to be public
- ✅ Cannot be replayed for unauthorized access
- ✅ QR code can be safely shared/displayed

### Digital Identifier System
- **Format**: `HID_` prefix + UUID (e.g., `HID_a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- **Purpose**: Public identifier designed for QR codes
- **Security**: No direct link to internal user IDs
- **Uniqueness**: Globally unique, can be regenerated if compromised

## 📋 API Endpoints

### New Endpoints Added

#### Patient QR Code Generation
```typescript
GET /api/patient/qr?format=png&width=300&height=300
// Authenticated endpoint - returns patient's QR code
```

#### Patient QR Code Regeneration  
```typescript
POST /api/patient/qr/regenerate
// Allows patients to refresh their digital identifier for security
```

#### Authorization Request Creation
```typescript
POST /api/v1/authorizations/request
// Creates authorization request after scanning patient QR code
```

### Updated Services

#### QRCodeService Methods
```typescript
// New methods aligned with knowledge base
QRCodeService.generatePatientQR(digitalIdentifier, options)
QRCodeService.generatePatientQRSVG(digitalIdentifier, options)  
QRCodeService.validatePatientQRCode(scannedData)
QRCodeService.createPatientQRURL(digitalIdentifier, baseURL)
QRCodeService.createAuthRequestURL(baseURL)
```

## 🧪 Testing

### Comprehensive Test Coverage
- ✅ Patient QR code generation (PNG & SVG)
- ✅ QR code validation and parsing
- ✅ Digital identifier extraction
- ✅ Access token generation
- ✅ URL creation utilities
- ✅ Error handling scenarios

### Test Files Updated
- `__tests__/lib/services/qr-code-service.test.ts` - Complete rewrite
- All tests now align with the knowledge base specification

## 🔄 Migration Guide

### For Frontend Components
```typescript
// OLD - Don't use this anymore
const qrUrl = `/api/qr/${grantId}`;

// NEW - Use patient QR endpoint  
const qrUrl = `/api/patient/qr?format=png&width=300`;
```

### For Healthcare Provider Integration
```typescript
// After scanning patient QR code
const qrData = QRCodeService.validatePatientQRCode(scannedString);
if (qrData) {
  // Create authorization request
  const response = await fetch('/api/v1/authorizations/request', {
    method: 'POST',
    body: JSON.stringify({
      scannedQRData: scannedString,
      organizationId: currentOrganization.id,
      accessScope: { /* permissions */ },
      timeWindowHours: 24
    })
  });
}
```

## 🔐 JWT Access Token System (Latest Update)

### **Access Token Upgrade**
The system has been further improved to use **JWT-based access tokens** instead of random hex strings:

#### **Before**: Random Hex Tokens
```typescript
// Old method - random string
const { token } = QRCodeService.generateAccessToken(); // No parameters
// Returns: { token: "a1b2c3d4...", expiresAt: Date }
```

#### **After**: JWT Tokens  
```typescript
// New method - structured JWT
const { token } = QRCodeService.generateAccessToken(
  digitalIdentifier,  // Patient's HID
  grantId,           // Authorization grant ID
  expiresInSeconds   // Optional expiration
);
// Returns: { token: "eyJ0eXAiOiJKV1QiLCJhbGc...", expiresAt: Date }
```

#### **JWT Token Structure**
```json
{
  "type": "qr_access_grant",
  "digitalIdentifier": "HID_a1b2c3d4-...",
  "grantId": "grant_xyz789",
  "purpose": "healthcare_authorization",
  "iss": "health-app",
  "aud": "health-app-providers",
  "iat": 1691234567,
  "exp": 1691238167
}
```

#### **Security Benefits**
- **Cryptographically Signed**: Tamper-proof with HMAC SHA-256
- **Stateless Verification**: No database lookup required
- **Structured Claims**: Contains verified identity and grant information
- **Built-in Expiration**: Automatic time-based validation
- **Audience Validation**: Ensures tokens used by intended recipients

#### **New Verification Method**
```typescript
const decoded = QRCodeService.verifyAccessToken(token);
if (decoded) {
  // Token is valid and verified
  console.log("Patient:", decoded.digitalIdentifier);
  console.log("Grant:", decoded.grantId);
  console.log("Purpose:", decoded.purpose);
} else {
  // Token is invalid, expired, or tampered
  console.log("Access denied");
}
```

#### **Updated Method Signatures**
```typescript
// Both methods now require digitalIdentifier and grantId
QRCodeService.generateAccessToken(digitalIdentifier, grantId, expiresInSeconds?)
QRCodeService.generateShortLivedToken(digitalIdentifier, grantId, expiresInSeconds?)

// New verification method
QRCodeService.verifyAccessToken(token) // Returns decoded payload or null
```

## 📊 Benefits of Corrected Implementation

### Patient Experience
- ✅ **Simpler**: One QR code for all healthcare visits
- ✅ **Secure**: Can safely display QR code without exposing sensitive data
- ✅ **Control**: Patient always approves each access request explicitly

### Healthcare Provider Experience  
- ✅ **Streamlined**: Scan → Request → Approval → Access
- ✅ **Transparent**: Clear request/approval workflow
- ✅ **Compliant**: Full audit trail for all access

### System Security
- ✅ **Reduced Attack Surface**: No sensitive data in QR codes
- ✅ **Proper Authorization**: Every access requires explicit patient consent
- ✅ **Audit Trail**: Complete logging of all access requests and grants

## 🚀 Next Steps

1. **Frontend Updates**: Update patient portal to use new QR code endpoints
2. **Provider Integration**: Update healthcare provider interfaces for new flow
3. **Notification System**: Implement push notifications for authorization requests
4. **Documentation**: Update API documentation for healthcare providers
5. **Training**: Update user guides for the corrected workflow

---

**Note**: The old QR code endpoints (`/api/qr/[grantId]`) are deprecated and should be removed after migration is complete.
