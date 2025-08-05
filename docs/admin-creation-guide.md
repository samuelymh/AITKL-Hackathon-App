# Admin User Creation Guide

This guide covers the secure backend-only process for creating and managing admin users in the healthcare application.

## Security Design

For security reasons, admin users **cannot** be created through the regular UI registration flow. All admin creation is restricted to secure backend processes to prevent unauthorized privilege escalation.

## Available Methods

## ✅ **Confirmed Working Solution**

**Database Connection Confirmed**: The admin creation system has been tested and verified working with the production MongoDB database.

**Schema Issue Fixed**: All admin users now have required schema fields (`auditCreatedBy`, `auditCreatedDateTime`, `personalInfo.dateOfBirth`).

**Current Admin Users in Database**:
- admin@test.com (Test Admin) ✅ Schema Fixed
- admin2@healthcare.com (Jane Smith) ✅ Schema Fixed
- admin3@system.com (System Administrator) ✅ Schema Fixed

## Available Methods

### 1. **Comprehensive Admin Manager** (⭐ Recommended)

The most complete admin management tool:

```bash
# Set environment variable
export MONGODB_URI="env.MONGODB_URI"

# List all admin users
node scripts/admin-manager.js list

# Create new admin
node scripts/admin-manager.js create admin@example.com password123 John Doe "+1234567890"

# Deactivate admin (soft delete)
node scripts/admin-manager.js deactivate 689190d3b4703104dd538c23

# Reactivate admin
node scripts/admin-manager.js activate 689190d3b4703104dd538c23
```

**Example Output:**
```
� Admin Users List

✅ Connected to database
📊 Found 3 admin user(s):

1. 🟢 Active
   ID: 689193e90ad2deef48c28e92
   Email: admin3@system.com
   Name: System Administrator
   Phone: +1555000123
   Created: 8/5/2025

2. � Active
   ID: 6891912481d734bf93b5ea4c
   Email: admin2@healthcare.com
   Name: Jane Smith
   Phone: +1987654321
   Created: 8/5/2025

3. 🔴 Inactive
   ID: 689190d3b4703104dd538c23
   Email: admin@test.com
   Name: Test Admin
   Phone: +1234567890
   Created: 8/5/2025
```

### 2. **Simple CLI Script** (Quick Creation)

For fast admin creation with command line arguments:

```bash
# Create admin with all details in one command
node scripts/create-admin-cli.js admin@hospital.com password123 John Doe "+1234567890"

# Get usage help
node scripts/create-admin-cli.js
```

### 3. **List Admin Users** (View Only)

To see all existing admin users:

```bash
node scripts/list-admin-users.js
```

### 4. **Interactive Script** (Guided Creation)

For step-by-step admin creation:

```bash
node scripts/create-admin-simple.js
```

### 5. **Password Reset Tool** (🔑 New!)

Reset admin passwords when needed:

```bash
# Reset password by email
node scripts/reset-admin-password.js admin@test.com newSecurePassword123

# Reset password by admin ID
node scripts/reset-admin-password.js 689190d3b4703104dd538c23 newSecurePassword123

# Get usage help
node scripts/reset-admin-password.js
```

**Example Output:**
```
🔐 Admin Password Reset Tool

✅ Connected to database
🔍 Searching for admin by email: admin@test.com
📋 Admin found: Test Admin
📧 Email: admin@test.com
🔒 Hashing new password...

✅ Password reset successfully!
- Admin ID: 689190d3b4703104dd538c23
- Email: admin@test.com
- Name: Test Admin
- Password Changed: 2025-08-05T05:21:35.103Z
✅ Audit log created
```

### 7. **Schema Fix Tool** (🔧 Fixed!)

Fix existing admin users that might have schema issues:

```bash
# Fix all existing admin users
node scripts/fix-existing-admins.js

# Show admin user structure for debugging
node scripts/show-admin-structure.js admin@test.com
```

This tool adds missing required fields to existing admin users:
- `auditCreatedBy` and `auditCreatedDateTime` (required by BaseSchema)
- `personalInfo.dateOfBirth` (required by User model)
- Complete `auth` object structure
- Proper `medicalInfo` and `contact.verified` structures

### 6. **Credentials Verification Tool** (🔍 New!)

Verify admin login credentials without the web server:

```bash
# Verify credentials work
node scripts/verify-admin-credentials.js admin@test.com newPassword123

# Test other admin accounts
node scripts/verify-admin-credentials.js admin2@healthcare.com KnownPassword123
node scripts/verify-admin-credentials.js admin3@system.com SecurePass456
```

**Example Output:**
```
🔐 Admin Credentials Verification

✅ Connected to database
📋 Admin found: Test Admin
🔒 Verifying password...

✅ Credentials are VALID!

Admin Details:
- Email: admin@test.com
- Name: Test Admin
- Role: admin
- Active: Yes
🎯 This admin can login to the application!
```

## 🔑 **Admin Login Credentials**

**📋 See [Admin Credentials Reference](./admin-credentials.md) for current passwords and login instructions.**

**Current Working Admin Accounts:**
- `admin@test.com` / `newPassword123` - Test Admin ✅ Verified
- `admin2@healthcare.com` / `KnownPassword123` - Jane Smith ✅ Verified
- `admin3@system.com` / `SecurePass456` - System Administrator ✅ Verified

### 3. TypeScript CLI (Advanced Management)

For comprehensive admin management operations:

```bash
# Install TypeScript execution dependency if needed
npm install -g tsx

# Create admin
npx tsx scripts/admin-cli.ts create \
  --email admin@example.com \
  --password securePassword123 \
  --firstName John \
  --lastName Doe \
  --phone "+1234567890"

# List all admins
npx tsx scripts/admin-cli.ts list

# Deactivate admin
npx tsx scripts/admin-cli.ts deactivate --id 65a1b2c3d4e5f6789abcdef0
```

### 3. Admin API Endpoints (Web Interface)

For programmatic admin management through authenticated API calls:

**Base URL:** `/api/admin/users`

#### Create Admin (POST)
```typescript
POST /api/admin/users
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "securePassword123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890"
}
```

#### List Admins (GET)
```typescript
GET /api/admin/users
Authorization: Bearer <admin-jwt-token>
```

#### Deactivate Admin (DELETE)
```typescript
DELETE /api/admin/users/65a1b2c3d4e5f6789abcdef0
Authorization: Bearer <admin-jwt-token>
```

## Admin User Capabilities

Admin users have the following privileges:

### Organization Management
- View all organizations in the system
- Approve/reject organization verification requests
- Access organization member details
- Manage organization status

### User Management
- Create new admin users (via backend only)
- List all admin users
- Deactivate admin users
- View user audit logs

### System Administration
- Access audit logs
- Manage system-wide settings
- Monitor application health
- Review security events

## Security Features

### Authentication & Authorization
- **Admin-only endpoints**: All admin operations require valid admin JWT tokens
- **Role-based access**: Strict role checking prevents privilege escalation
- **Self-protection**: Admins cannot deactivate their own accounts

### Input Validation & Sanitization
- **Zod schema validation**: All input data is validated against strict schemas
- **Input sanitization**: Email, text, and phone inputs are sanitized
- **ObjectId validation**: MongoDB ObjectIds are validated for proper format

### Audit Logging
- **Creation tracking**: All admin creations are logged with creator details
- **Action logging**: Admin actions are logged for compliance
- **Security monitoring**: Failed attempts and security events are tracked

### Password Security
- **Minimum requirements**: 8-character minimum, 128-character maximum
- **bcrypt hashing**: Passwords are hashed with secure salt rounds
- **No plaintext storage**: Passwords are never stored in plaintext

## Best Practices

### Initial Setup
1. **First Admin**: Use the Node.js script to create the initial admin user
2. **Environment Variables**: Ensure proper database connection strings
3. **Security Keys**: Verify JWT secrets are properly configured

### Ongoing Management
1. **Regular Audits**: Review admin user list periodically
2. **Least Privilege**: Only create admin users when necessary
3. **Account Cleanup**: Deactivate unused admin accounts
4. **Password Policy**: Enforce strong passwords for all admin users

### Security Recommendations
1. **Network Security**: Restrict admin operations to secure networks
2. **Session Management**: Use short-lived JWT tokens
3. **Backup Access**: Maintain multiple admin accounts for redundancy
4. **Monitoring**: Set up alerts for admin account activities

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
Error: MongoNetworkError: failed to connect to server
```
**Solution**: Verify MongoDB connection string and network accessibility

#### Duplicate Email Errors
```bash
Error: Admin user with this email already exists
```
**Solution**: Check existing admin users with the list command

#### Permission Errors
```bash
Error: Insufficient permissions
```
**Solution**: Ensure you're using a valid admin JWT token

#### Validation Errors
```bash
Error: Invalid email address format
```
**Solution**: Check input format against the validation schema

### Environment Setup

### Environment Setup

**✅ Verified Working Connection**:
```bash
# Production MongoDB Atlas (currently working)
export MONGODB_URI="env.MONGODB_URI"
```

**For Development**:
```bash
# Copy .env.example to .env.local and configure:
cp .env.example .env.local

# Edit .env.local with your MongoDB connection:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Required Environment Variables**:
```env
# Database (Required)
MONGODB_URI=mongodb+srv://...
DATABASE_URL=mongodb+srv://...  # Alternative name

# Authentication (Required for API endpoints)
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d

# Admin Settings (Optional)
ADMIN_CREATION_ENABLED=true
```

### Environment Setup

Before using any admin creation method, ensure your MongoDB connection is properly configured:

#### Option 1: Environment Variable (Recommended)
```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority&appName=YourApp"
```

#### Option 2: .env.local File
Create a `.env.local` file in your project root:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority&appName=YourApp
```

#### Option 3: Inline with Command
```bash
MONGODB_URI="your-connection-string" node scripts/create-admin-cli.js args...
```

### Real-World Examples

#### Create Your First Admin
```bash
# Set environment variable (replace with your actual connection string)
export MONGODB_URI="env.MONGODB_URI"

# Create the admin user
node scripts/create-admin-cli.js admin@yourcompany.com securePassword123 John Doe "+1234567890"
```

#### Successful Output Example
```
🔧 Admin User Creation Tool

Creating admin user for: admin@yourcompany.com
Name: John Doe  
Phone: +1234567890

🔄 Creating admin user...
✅ Connected to database

✅ Admin user created successfully!

Admin Details:
- ID: 689190d3b4703104dd538c23
- Email: admin@yourcompany.com
- Name: John Doe
- Role: admin
- Digital ID: aa6a1c0e-b114-42fd-8944-058ad71d6dd2
- Created: 2025-08-05T05:04:20.010Z
✅ Audit log created
```

### Database Requirements

The admin creation process requires:
- Active MongoDB connection
- `users` collection with proper indexes
- `auditlogs` collection for tracking
- Proper database permissions for read/write operations

## Support

For additional support with admin user management:

1. **Check Logs**: Review application logs for detailed error information
2. **Database Status**: Verify MongoDB connection and health
3. **Environment**: Confirm all required environment variables are set
4. **Documentation**: Refer to the main project README for setup instructions

## Security Considerations

⚠️ **Important Security Notes:**

1. **Admin Credentials**: Never share admin credentials
2. **Production Access**: Limit production admin creation to authorized personnel
3. **Audit Trail**: Maintain complete audit logs of admin activities
4. **Regular Reviews**: Conduct periodic access reviews
5. **Incident Response**: Have procedures for compromised admin accounts

---

*This guide is part of the healthcare application security documentation. For system architecture and other security topics, refer to the main documentation in the `/docs` folder.*
