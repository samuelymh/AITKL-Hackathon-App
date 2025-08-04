# JWT Implementation Documentation

This document describes the JWT (JSON Web Token) implementation used in the AITKL Hackathon App.

## Overview

The JWT implementation provides secure token-based authentication using Node.js built-in crypto module. It includes:

- Token generation with digital identifier and expiry time
- Token verification and validation
- Utility functions for authentication middleware

## Files

- `lib/jwt.ts` - Core JWT functionality
- `lib/auth.ts` - Authentication utilities and middleware helpers
- `app/api/qr-code/route.ts` - Example usage in QR code generation
- `app/api/verify-token/route.ts` - Example token verification endpoint

## Usage

### 1. Generating JWT Tokens

```typescript
import { JWT } from '@/lib/jwt';

// Generate a token with 30-minute expiration
const token = JWT.encode(
  {
    digitalIdentifier: 'user123',
    type: 'qr_code',
  },
  30 * 60
); // 30 minutes in seconds
```

### 2. Verifying JWT Tokens

```typescript
import { JWT } from '@/lib/jwt';

try {
  const payload = JWT.decode(token);
  console.log('Token is valid:', payload);
} catch (error) {
  console.log('Token is invalid:', error.message);
}
```

### 3. Using Authentication Utilities

```typescript
import { getUserFromToken, hasValidToken } from '@/lib/auth';

// Check if request has valid token
if (hasValidToken(request)) {
  const user = getUserFromToken(request);
  // Process authenticated request
}
```

### 4. API Route Example

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, hasValidToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserFromToken(request);
  // Process request with user data
}
```

## Environment Variables

Set the following environment variable for production:

```env
JWT_SECRET=your-secure-secret-key-here
```

**Important**: Change the default secret key in production for security.

## Token Structure

The JWT tokens contain:

- **Header**: Algorithm (HS256) and token type (JWT)
- **Payload**:
  - `digitalIdentifier`: User's unique identifier
  - `type`: Token type (e.g., 'qr_code', 'user_token')
  - `iat`: Issued at timestamp
  - `exp`: Expiration timestamp
- **Signature**: HMAC-SHA256 signature for verification

## Security Features

1. **Signature Verification**: All tokens are cryptographically signed
2. **Expiration Checking**: Automatic validation of token expiration
3. **Format Validation**: Ensures proper JWT structure
4. **Secure Defaults**: Uses environment variables for secrets

## API Endpoints

### POST /api/qr-code

Generates a JWT token for QR code functionality.

**Request:**

```json
{
  "digitalIdentifier": "user123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-01T12:30:00.000Z"
}
```

### POST /api/verify-token

Verifies a JWT token and returns user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "digitalIdentifier": "user123",
    "type": "qr_code",
    "issuedAt": "2024-01-01T12:00:00.000Z",
    "expiresAt": "2024-01-01T12:30:00.000Z",
    "isExpired": false
  }
}
```

## Error Handling

The JWT implementation throws specific errors:

- `Invalid JWT format` - Token structure is incorrect
- `Invalid JWT signature` - Token signature verification failed
- `JWT has expired` - Token has passed its expiration time

## Best Practices

1. **Always verify tokens** before processing sensitive operations
2. **Use short expiration times** for security-sensitive tokens
3. **Store secrets securely** using environment variables
4. **Handle errors gracefully** in your application
5. **Log authentication events** for security monitoring

## Testing

You can test the JWT functionality using curl:

```bash
# Generate a token
curl -X POST http://localhost:3000/api/qr-code \
  -H "Content-Type: application/json" \
  -d '{"digitalIdentifier": "test123"}'

# Verify a token
curl -X POST http://localhost:3000/api/verify-token \
  -H "Authorization: Bearer <your-token-here>"
```
