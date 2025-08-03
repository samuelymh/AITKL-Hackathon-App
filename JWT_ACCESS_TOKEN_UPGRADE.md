# JWT Access Token Upgrade

## Overview

The QRCodeService has been upgraded to generate JWT-based access tokens instead of random hex strings. This improves security, provides structured claims, and aligns with modern authentication standards.

## Changes Made

### 1. QRCodeService Updates

#### Method Signature Changes
- `generateAccessToken(digitalIdentifier, grantId, expiresInSeconds?)` - Now requires digitalIdentifier and grantId
- `generateShortLivedToken(digitalIdentifier, grantId, expiresInSeconds?)` - Now requires digitalIdentifier and grantId
- Added `verifyAccessToken(token)` - New method to verify and decode JWT tokens

#### JWT Token Structure
```typescript
{
  type: "qr_access_grant",
  digitalIdentifier: string,    // Patient's HID
  grantId: string,             // Authorization grant ID
  purpose: "healthcare_authorization",
  iss: "health-app",           // Issuer
  aud: "health-app-providers", // Audience
  iat: number,                 // Issued at timestamp
  exp: number                  // Expiration timestamp
}
```

### 2. Security Improvements

#### JWT Benefits
- **Stateless Authentication**: No need to store tokens in database
- **Structured Claims**: Token contains verified identity and grant information
- **Tamper-Proof**: Cryptographically signed with HMAC SHA-256
- **Expiration Control**: Built-in expiration validation
- **Audience Validation**: Ensures tokens are used by intended recipients

#### Token Validation
- Signature verification using JWT_SECRET
- Issuer/audience validation
- Expiration time validation
- Token structure validation (type, digitalIdentifier, grantId)

### 3. Updated Endpoints

#### `/app/api/qr/[grantId]/route.ts`
- Updated POST method to generate JWT access tokens with proper parameters
- Added note about endpoint compliance with knowledge base specification

#### Authorization Request Flow
The main authorization flow via `/api/v1/authorizations/request` remains unchanged and follows the knowledge base specification:
1. Healthcare provider scans patient QR code (contains only digitalIdentifier)
2. System creates authorization grant with status: PENDING
3. Push notification sent to patient
4. Patient approves/denies the request
5. When approved, JWT access tokens can be generated for API access

### 4. Test Updates

#### New Test Coverage
- JWT token generation with correct claims
- Token verification and decoding
- Error handling for JWT signing failures
- Validation of token structure and expiration
- Audience and issuer validation

#### Test Results
```
✓ should generate JWT access token with default expiration
✓ should generate JWT access token with custom expiration  
✓ should throw TokenGenerationError on JWT signing failure
✓ should generate short-lived JWT token with default 15 minutes
✓ should generate short-lived JWT token with custom duration
✓ should verify valid JWT access token
✓ should return null for invalid token
✓ should return null for expired token
✓ should return null for token with wrong type
```

## Usage Examples

### Generate Access Token
```typescript
const accessTokenData = QRCodeService.generateAccessToken(
  "HID123456",     // Patient's digital identifier
  "grant_abc123",  // Authorization grant ID
  3600            // 1 hour expiration (optional)
);

// Returns: { token: "eyJ...", expiresAt: Date }
```

### Verify Access Token
```typescript
const decoded = QRCodeService.verifyAccessToken(token);
if (decoded) {
  console.log("Patient ID:", decoded.digitalIdentifier);
  console.log("Grant ID:", decoded.grantId);
  console.log("Purpose:", decoded.purpose);
} else {
  console.log("Invalid or expired token");
}
```

### Generate Short-Lived Token
```typescript
const shortToken = QRCodeService.generateShortLivedToken(
  "HID123456",
  "grant_abc123",
  900  // 15 minutes (default)
);
```

## Environment Variables

Ensure these environment variables are set for JWT functionality:

```env
JWT_SECRET=your-super-secret-jwt-key-256-bits-minimum
JWT_ISSUER=health-app
JWT_AUDIENCE=health-app-providers
```

## Migration Notes

### Breaking Changes
- `generateAccessToken()` and `generateShortLivedToken()` now require digitalIdentifier and grantId parameters
- Tokens are now JWTs instead of random hex strings
- Token format has changed completely

### Backward Compatibility
- Existing authorization flow endpoints remain unchanged
- Patient QR code generation is unaffected
- QR code validation methods work as before

## Security Considerations

### JWT Secret Management
- Use a strong, randomly generated secret key (minimum 256 bits)
- Rotate JWT secrets periodically in production
- Store secrets securely using environment variables or key management services

### Token Scope
- JWT access tokens are specifically for QR code authorization grants
- They are separate from user authentication tokens
- Limited to healthcare provider audience validation

### Expiration Strategy
- Default: 1 hour for regular access tokens
- Short-lived: 15 minutes for high-security operations
- Configure based on security requirements and user experience needs

## Future Enhancements

### Possible Improvements
1. **Token Refresh**: Implement refresh token mechanism for long-lived sessions
2. **Role-Based Claims**: Add provider role information to JWT claims
3. **Audit Trail**: Include audit trail references in token claims
4. **Key Rotation**: Implement automatic JWT secret rotation
5. **Token Revocation**: Add token blacklist mechanism for immediate revocation

### Integration Points
- Middleware for automatic JWT validation in protected routes
- Integration with existing audit logging system
- Connection to user authentication and authorization systems

## Compliance

This JWT implementation aligns with:
- **Knowledge Base Specification**: QR codes contain only digital identifier
- **Security Best Practices**: Cryptographically signed, time-limited tokens
- **Healthcare Standards**: Audit trails, access control, data protection
- **Modern Auth Patterns**: Stateless authentication, structured claims
