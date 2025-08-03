# Security & Middleware Implementation Guide

## Overview

This document outlines the comprehensive security and middleware implementation for the health application, focusing on production-ready authentication, authorization, rate limiting, logging, and error handling.

## ✅ Completed Security Features

### 1. JWT Refresh Token Implementation

**Location**: `/lib/auth.ts`, `/app/api/auth/refresh/route.ts`

**Features**:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token rotation for enhanced security
- Secure claims validation (issuer, audience)
- Token version management for invalidation

**Usage**:
```typescript
// Generate tokens
const accessToken = generateToken(userPayload);
const refreshToken = generateRefreshToken(userId, tokenVersion);

// Verify tokens
const payload = verifyToken(accessToken);
const refreshPayload = verifyRefreshToken(refreshToken);
```

### 2. Rate Limiting Middleware

**Location**: `/lib/middleware/rate-limit.ts`

**Features**:
- In-memory rate limiting with configurable windows
- Client identification via IP + User Agent
- Automatic cleanup of expired entries
- Flexible configuration for different endpoints
- Rate limit headers in responses

**Configurations**:
- Auth endpoints: 5 requests/15 minutes
- General API: 100 requests/minute
- Public endpoints: 200 requests/minute

### 3. Authentication Middleware

**Location**: `/lib/middleware/auth.ts`

**Features**:
- JWT token validation
- Role-based access control
- Optional authentication for public routes
- Pre-built role-specific middleware

**Examples**:
```typescript
// Admin only
export const POST = withAdminAuth(handler);

// Medical staff only
export const GET = withMedicalStaffAuth(handler);

// Any authenticated user
export const PUT = withAnyAuth(handler);
```

### 4. Comprehensive Logging

**Location**: `/lib/middleware/logging.ts`

**Features**:
- Request/response logging with user context
- Performance monitoring (slow request detection)
- Security-focused audit logging
- Structured JSON logs for analysis
- Automatic audit trail for sensitive operations

**Audit Triggers**:
- All authentication operations
- User management changes
- Prescription modifications
- Medical record updates
- Error responses (4xx/5xx)

### 5. Error Handling Middleware

**Location**: `/lib/middleware/error-handling.ts`

**Features**:
- Centralized error handling
- Type-specific error responses
- Validation error formatting
- Database error handling
- Network error detection
- Development vs production error details

**Supported Error Types**:
- Zod validation errors
- MongoDB/Mongoose errors
- JWT authentication errors
- Cast errors (invalid ObjectIds)
- Network/timeout errors
- Rate limiting errors

### 6. Middleware Composition System

**Location**: `/lib/middleware/index.ts`

**Pre-configured Middleware**:
- `publicApiMiddleware` - Public endpoints with basic rate limiting
- `authenticatedApiMiddleware` - Authenticated routes with standard protection
- `authEndpointMiddleware` - Login/register with strict rate limiting
- `adminApiMiddleware` - Admin-only with enhanced logging
- `medicalStaffApiMiddleware` - Healthcare provider access
- `highSecurityApiMiddleware` - Critical operations with maximum security

## 🔐 Security Best Practices Implemented

### Authentication & Authorization
- ✅ Short-lived access tokens
- ✅ Refresh token rotation
- ✅ Secure JWT claims validation
- ✅ Role-based permissions
- ✅ Token version management for invalidation

### Rate Limiting
- ✅ Endpoint-specific rate limits
- ✅ Failed request counting
- ✅ IP-based client identification
- ✅ Automatic cleanup of tracking data

### Audit & Monitoring
- ✅ Comprehensive request logging
- ✅ Security event tracking
- ✅ Performance monitoring
- ✅ Error categorization and logging

### Error Handling
- ✅ Secure error responses (no sensitive data leakage)
- ✅ Validation error formatting
- ✅ Database error abstraction
- ✅ Graceful fallback handling

## 🚀 Usage Examples

### Updating Existing Routes

```typescript
// Before
export async function POST(request: NextRequest) {
  // handler logic
}

// After - with comprehensive middleware
export const POST = authenticatedApiMiddleware(
  async (request: NextRequest, authContext: AuthContext) => {
    // handler logic with guaranteed auth context
  },
  [UserRole.DOCTOR, UserRole.ADMIN] // optional role restriction
);
```

### Creating New Protected Routes

```typescript
// High-security medical route
export const POST = highSecurityApiMiddleware(
  async (request: NextRequest, authContext: AuthContext) => {
    // Critical operation with full security stack
  },
  [UserRole.DOCTOR]
);

// Admin management route
export const DELETE = adminApiMiddleware(
  async (request: NextRequest, authContext: AuthContext) => {
    // Admin-only operation
  }
);
```

### Using Refresh Tokens

```typescript
// Client-side token refresh
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  
  if (response.ok) {
    const { accessToken, refreshToken: newRefreshToken } = await response.json();
    // Update stored tokens
  }
}
```

## 📊 Monitoring & Observability

### Log Categories
- `[REQUEST]` - Incoming requests with user context
- `[RESPONSE]` - Response logs with timing
- `[ERROR]` - Error responses with details
- `[AUDIT]` - Security-critical operations
- `[SLOW_REQUEST]` - Performance monitoring (>1s)

### Metrics to Monitor
- Request rate per endpoint
- Error rates by status code
- Authentication failure rates
- Token refresh frequency
- Slow request patterns

## 🔧 Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=health-app
JWT_AUDIENCE=health-app-users

# Security Settings
ROTATE_REFRESH_TOKENS=true
NODE_ENV=production
```

### Rate Limit Customization

```typescript
// Custom rate limiting
export const POST = withRateLimit(handler, {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  message: "Custom rate limit message",
  skipSuccessfulRequests: true,
});
```

## 🚨 Security Considerations

### Token Management
- Access tokens are short-lived (15 minutes)
- Refresh tokens can be rotated on each use
- Token versions allow for immediate invalidation
- Secure storage required on client side

### Rate Limiting
- Adjust limits based on usage patterns
- Monitor for abuse patterns
- Consider implementing distributed rate limiting for scaling

### Logging & Privacy
- Audit logs contain user IDs but not sensitive data
- Error logs exclude sensitive information in production
- Consider GDPR compliance for log retention

### Error Handling
- Never expose internal system details
- Validate all inputs before processing
- Log security events for monitoring

## 📚 Next Steps for Production

### Recommended Additions
1. **Distributed Rate Limiting**: Use Redis for multi-instance deployments
2. **External Logging**: Integrate with CloudWatch, ELK, or similar
3. **Monitoring Dashboard**: Set up alerts for security events
4. **Load Testing**: Validate rate limits and performance
5. **Security Scanning**: Regular vulnerability assessments

### Database Audit Table
Consider implementing a dedicated audit table for compliance:

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  method: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  details?: any;
}
```

This implementation provides a solid foundation for a production-ready health application with comprehensive security, monitoring, and error handling capabilities.
