# Admin Login Credentials Reference

## ✅ **Schema Issue Fixed**

**Issue Resolved**: The admin users were missing required schema fields (`auditCreatedBy`, `auditCreatedDateTime`, `personalInfo.dateOfBirth`). All existing admin users have been updated with the required fields.

**Fix Applied**: `scripts/fix-existing-admins.js` has been used to update all existing admin users with missing required fields.

## 🔑 Current Admin Users & Passwords

### **Test Environment Admins**

| Email | Password | Name | Admin ID | Status |
|-------|----------|------|----------|--------|
| `admin@test.com` | `newPassword123` | Test Admin | `689190d3b4703104dd538c23` | ✅ Active |
| `admin2@healthcare.com` | `KnownPassword123` | Jane Smith | `6891912481d734bf93b5ea4c` | ✅ Active |
| `admin3@system.com` | `SecurePass456` | System Administrator | `689193e90ad2deef48c28e92` | ✅ Active |

## 🚀 How to Login as Admin

### **Web Application Login**

1. Navigate to the login page: `/login`
2. Use any of the admin credentials above
3. After login, you'll have admin privileges to:
   - View organization verification requests
   - Manage other admin users (via API)
   - Access admin-only features

### **API Authentication**

For programmatic access, get a JWT token:

```bash
# Login via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "newPassword123"
  }'
```

Use the returned JWT token in subsequent API requests:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/users
```

## 🔄 Password Management

### **Reset Admin Password**

If you forget a password or need to change it:

```bash
# Reset by email
MONGODB_URI="your-connection-string" \
node scripts/reset-admin-password.js admin@test.com newSecurePassword

# Reset by admin ID
MONGODB_URI="your-connection-string" \
node scripts/reset-admin-password.js 689190d3b4703104dd538c23 newSecurePassword
```

### **Create New Admin with Known Password**

```bash
# Create admin with specific password
MONGODB_URI="your-connection-string" \
node scripts/admin-manager.js create newadmin@example.com myKnownPassword123 John Doe "+1234567890"
```

## 🔐 Security Best Practices

### **Password Requirements**
- Minimum 8 characters
- Maximum 128 characters
- Use strong, unique passwords in production

### **Production Recommendations**
1. **Change default passwords** before deploying
2. **Use environment-specific passwords** (dev/staging/prod)
3. **Implement password rotation** policy
4. **Enable audit logging** for all admin activities
5. **Use MFA** when available

### **Development vs Production**
- **Development**: Use simple passwords for testing
- **Production**: Use complex, unique passwords
- **Never commit passwords** to version control

## 📊 Admin Management Commands

### **Quick Reference**

```bash
# List all admins
node scripts/admin-manager.js list

# Create admin
node scripts/admin-manager.js create email password firstName lastName phone

# Reset password
node scripts/reset-admin-password.js email newPassword

# Deactivate admin
node scripts/admin-manager.js deactivate adminId

# Activate admin
node scripts/admin-manager.js activate adminId
```

## 🚨 Emergency Access

### **If You Lose All Admin Access**

1. **Create new admin via script**:
   ```bash
   node scripts/admin-manager.js create emergency@admin.com EmergencyPass123 Emergency Admin
   ```

2. **Reset existing admin password**:
   ```bash
   node scripts/reset-admin-password.js existing@admin.com NewPassword123
   ```

3. **Check database directly** (if needed):
   ```bash
   node scripts/list-admin-users.js
   ```

## 🔍 Troubleshooting

### **Common Issues**

**"Invalid credentials" during login**
- Verify email is correct (case-sensitive)
- Ensure password matches exactly
- Check if admin is active (not deactivated)

**"Admin not found" during password reset**
- Verify admin ID or email is correct
- Check if user exists with `list-admin-users.js`
- Ensure role is set to "admin"

**Database connection errors**
- Verify MONGODB_URI environment variable
- Check network connectivity
- Ensure database credentials are correct

---

**⚠️ Security Note**: Keep this credentials file secure and never commit it to version control in production environments.
