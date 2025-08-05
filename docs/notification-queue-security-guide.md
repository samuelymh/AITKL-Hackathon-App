# Notification Queue API Security & Usage Guide

## 🔐 Security Implementation Summary

The `/api/admin/queue/process` and `/api/admin/queue/cleanup` endpoints have been completely secured with multi-layered authentication and comprehensive input validation.

### **Authentication Methods**

#### 1. **Admin JWT Authentication** (For Web UI)
- **Header**: `Authorization: Bearer <jwt_token>`
- **Required Role**: `ADMIN`
- **Use Case**: Admin dashboard, manual queue management
- **Validation**: Full JWT verification with role-based access control

```typescript
// Example request
fetch('/api/admin/queue/process', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ batchSize: 15 })
});
```

#### 2. **Admin API Key Authentication** (For Scripts/Tools)
- **Header**: `x-api-key: <admin_api_key>`
- **Use Case**: Administrative scripts, monitoring tools
- **Environment Variable**: `ADMIN_API_KEY`

```bash
curl -X POST https://your-app.vercel.app/api/admin/queue/process \
  -H "x-api-key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20}'
```

#### 3. **Cron API Key Authentication** (For Automated Jobs)
- **Header**: `x-api-key: <cron_api_key>`
- **Use Case**: GitHub Actions, external cron services
- **Environment Variable**: `CRON_API_KEY`

```bash
curl -X POST https://your-app.vercel.app/api/admin/queue/process \
  -H "x-api-key: your-cron-api-key" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
```

### **Input Validation with Zod**

#### Queue Processing Request
```typescript
const QueueProcessSchema = z.object({
  batchSize: z.number().int().positive().max(100).default(10).optional(),
});
```

**Validation Rules:**
- `batchSize`: Optional integer between 1-100 (default: 10)
- Invalid requests return detailed error messages

#### Queue Cleanup Request  
```typescript
const QueueCleanupSchema = z.object({
  olderThanHours: z.number().int().positive().max(168).default(24).optional(),
});
```

**Validation Rules:**
- `olderThanHours`: Optional integer between 1-168 hours (default: 24)
- Maximum 1 week retention to prevent excessive data deletion

### **Enhanced Error Handling**

#### Authentication Errors
```json
{
  "success": false,
  "error": "Authentication required",
  "timestamp": "2025-08-05T10:30:00.000Z"
}
```

#### Validation Errors
```json
{
  "success": false,
  "error": "Invalid request body",
  "details": [
    "batchSize: Number must be greater than 0",
    "batchSize: Number must be less than or equal to 100"
  ],
  "timestamp": "2025-08-05T10:30:00.000Z"
}
```

#### Server Errors
```json
{
  "success": false,
  "error": "Failed to process notification queue",
  "details": "Database connection timeout",
  "timestamp": "2025-08-05T10:30:00.000Z"
}
```

## 🚀 Deployment Setup

### **1. Environment Variables**

Add these to your Vercel environment:

```bash
# Required for admin authentication
ADMIN_API_KEY=your-super-secret-admin-key-here
CRON_API_KEY=your-cron-service-api-key-here

# Existing variables
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
```

### **2. GitHub Secrets Configuration**

Configure these secrets in your GitHub repository:

```bash
# Repository Settings > Secrets and Variables > Actions
APP_URL=https://your-app.vercel.app
CRON_API_KEY=your-cron-service-api-key-here
# Optional: SLACK_WEBHOOK for failure notifications
```

### **3. Generate Secure API Keys**

```bash
# Generate strong API keys
openssl rand -base64 32  # For ADMIN_API_KEY
openssl rand -base64 32  # For CRON_API_KEY
```

## 📊 Usage Examples

### **Process Notification Queue**

#### Admin Dashboard (JWT Auth)
```typescript
const processQueue = async (batchSize: number = 10) => {
  const response = await fetch('/api/admin/queue/process', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ batchSize })
  });

  const result = await response.json();
  if (result.success) {
    console.log(`Processed ${result.data.succeeded} notifications`);
  }
};
```

#### Cron Job (API Key Auth)
```bash
#!/bin/bash
# process-queue.sh
curl -X POST $APP_URL/api/admin/queue/process \
  -H "x-api-key: $CRON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 25}' \
  --fail-with-body
```

### **Get Queue Statistics**

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  $APP_URL/api/admin/queue/process
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "pending": 15,
      "processing": 2,
      "completed": 450,
      "failed": 3,
      "retrying": 1
    },
    "timestamp": "2025-08-05T10:30:00.000Z",
    "retrievedBy": "admin-api-key",
    "authType": "api_key"
  }
}
```

### **Clean Up Old Jobs**

```bash
curl -X POST $APP_URL/api/admin/queue/cleanup \
  -H "x-api-key: $CRON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"olderThanHours": 72}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 127,
    "olderThanHours": 72,
    "cleanupAt": "2025-08-05T10:30:00.000Z",
    "cleanupBy": "cron-service",
    "authType": "cron"
  },
  "message": "Cleaned up 127 old notification jobs",
  "timestamp": "2025-08-05T10:30:00.000Z"
}
```

## 🔍 Monitoring & Logging

### **Enhanced Logging**

Each request now logs:
- Client IP address
- Authentication method used
- User/service identifier
- Request validation results
- Processing outcomes

### **Audit Trail**

All requests include:
- `processedBy` / `cleanupBy`: Identifier of the authenticated user/service
- `authType`: Type of authentication used ('admin', 'api_key', 'cron')
- `timestamp`: ISO timestamp of the operation

### **Security Monitoring**

Monitor logs for:
- Failed authentication attempts
- Invalid API key usage
- Suspicious IP addresses
- High-frequency requests

## 🛡️ Security Best Practices

### **API Key Management**
1. **Rotate Regularly**: Change API keys quarterly
2. **Secure Storage**: Use environment variables, never commit to code
3. **Separate Keys**: Different keys for admin vs cron operations
4. **Access Logging**: Monitor all API key usage

### **Network Security**
1. **IP Whitelisting**: Consider restricting cron endpoints to known IPs
2. **Rate Limiting**: Implement rate limiting for API key endpoints
3. **HTTPS Only**: Always use HTTPS in production
4. **CORS Configuration**: Restrict origins appropriately

### **Access Control**
1. **Principle of Least Privilege**: Admin role only for necessary users
2. **Token Expiration**: Use short-lived JWT tokens
3. **Session Management**: Proper logout and token invalidation
4. **Multi-Factor Authentication**: Consider MFA for admin accounts

## 🚨 Error Scenarios & Troubleshooting

### **Common Issues**

#### 1. Authentication Failures
```bash
# Test admin API key
curl -H "x-api-key: your-admin-key" $APP_URL/api/admin/queue/process

# Expected: 200 OK with queue stats
# If 401: Check API key value and environment variable
```

#### 2. Validation Errors
```bash
# Test with invalid batch size
curl -X POST $APP_URL/api/admin/queue/process \
  -H "x-api-key: your-key" \
  -d '{"batchSize": 150}'

# Expected: 400 Bad Request with validation details
```

#### 3. Rate Limiting
- Monitor for 429 responses
- Implement exponential backoff in automation scripts
- Consider request queuing for high-frequency operations

### **Health Checks**

```bash
# Basic health check
curl -H "x-api-key: $ADMIN_API_KEY" $APP_URL/api/admin/queue/process

# Check if processing is working
curl -X POST $APP_URL/api/admin/queue/process \
  -H "x-api-key: $CRON_API_KEY" \
  -d '{"batchSize": 1}'
```

## 📈 Performance Optimization

### **Batch Size Tuning**
- **Small Batches (1-10)**: Better for real-time processing
- **Medium Batches (10-30)**: Balanced performance
- **Large Batches (30-100)**: Maximum throughput, higher latency

### **Processing Frequency**
- **High Frequency (every minute)**: Real-time notifications
- **Medium Frequency (every 5 minutes)**: Standard operations
- **Low Frequency (every 15+ minutes)**: Background cleanup

### **Resource Management**
- Monitor Vercel function execution time
- Track database connection usage
- Optimize query performance with proper indexing

## 🔄 Migration Guide

### **Updating Existing Automation**

**Before (Unsecured):**
```bash
curl -X POST $APP_URL/api/admin/queue/process
```

**After (Secured):**
```bash
curl -X POST $APP_URL/api/admin/queue/process \
  -H "x-api-key: $CRON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
```

### **Admin Dashboard Updates**

Update admin UI components to:
1. Include JWT token in requests
2. Handle new error response format
3. Display enhanced response data (authType, processedBy, etc.)
4. Implement proper error handling for 401/403 responses

## ✅ Security Checklist

- [ ] API keys generated and stored securely
- [ ] Environment variables configured in Vercel
- [ ] GitHub secrets configured for automation
- [ ] Rate limiting implemented (if applicable)
- [ ] Monitoring and alerting set up
- [ ] Documentation updated for team
- [ ] Security testing completed
- [ ] Admin dashboard updated for new auth
- [ ] Automation scripts updated with API keys
- [ ] Backup access method established

The notification queue endpoints are now production-ready with enterprise-grade security, comprehensive validation, and detailed audit trails.
