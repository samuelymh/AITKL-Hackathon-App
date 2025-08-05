# Field-Level Encryption Implementation

## Overview

This implementation provides comprehensive field-level encryption for PII/PHI data in the healthcare application, ensuring compliance with HIPAA and other healthcare regulations while maintaining data usability and performance.

## 🔐 Architecture

### Core Components

1. **EncryptionService** (`lib/services/encryption-service.ts`)
   - Singleton service for encryption/decryption operations
   - Uses AES-256-GCM for authenticated encryption
   - Supports key versioning and rotation
   - Vercel-compatible (no external dependencies)

2. **EncryptionPlugin** (`lib/services/encryption-plugin.ts`)
   - Mongoose plugin for automatic field encryption/decryption
   - Transparent integration with existing schemas
   - Supports nested object paths and arrays

3. **EncryptionMigration** (`lib/services/encryption-migration.ts`)
   - Safe migration of existing plaintext data
   - Verification and rollback capabilities
   - Batch processing for large datasets

## 🚀 Features

### Security Features
- **AES-256-GCM**: Industry-standard authenticated encryption
- **Random IVs**: Each encryption uses a unique initialization vector
- **Key Versioning**: Support for key rotation without data loss
- **Authentication Tags**: Prevent tampering and ensure data integrity
- **Derived Keys**: PBKDF2-like key derivation for additional security

### Developer Experience
- **Transparent Operation**: Automatic encryption/decryption via Mongoose middleware
- **Type Safety**: TypeScript interfaces for encrypted fields
- **Error Handling**: Graceful degradation and comprehensive error reporting
- **Performance**: Optimized for concurrent operations and large datasets
- **Testing**: Comprehensive test suite with healthcare-specific scenarios

### Compliance
- **HIPAA Ready**: Field-level encryption for all PII/PHI data
- **Audit Trail**: All encryption operations can be logged
- **Data Portability**: Encrypted data maintains referential integrity
- **Key Management**: Designed for integration with enterprise key management

## 📋 Implementation

### Environment Configuration

Required environment variables:

```bash
# Production: Use 32-character random key
ENCRYPTION_MASTER_KEY=your-32-character-master-key-here

# Production: Use unique salt per environment  
ENCRYPTION_SALT=your-unique-salt-for-key-derivation

# Key rotation settings
KEY_ROTATION_ENABLED=false
CURRENT_KEY_VERSION=1
```

### Schema Integration

```typescript
import { encryptionPlugin, EncryptedFieldType } from '../services/encryption-plugin';

// Define interface with encrypted fields
interface IUser {
  personalInfo: {
    firstName: EncryptedFieldType;
    lastName: EncryptedFieldType;
    contact: {
      email: EncryptedFieldType;
      phone: EncryptedFieldType;
    };
  };
}

// Apply plugin to schema
UserSchema.plugin(encryptionPlugin, {
  encryptedFields: [
    'personalInfo.firstName',
    'personalInfo.lastName',
    'personalInfo.contact.email',
    'personalInfo.contact.phone'
  ]
});
```

### Encrypted Fields in User Model

The following fields are automatically encrypted:

#### Personal Information (PII)
- `personalInfo.firstName` - Patient's first name
- `personalInfo.lastName` - Patient's last name
- `personalInfo.contact.email` - Email address
- `personalInfo.contact.phone` - Phone number

#### Medical Information (PHI)
- `medicalInfo.knownAllergies` - Array of allergies
- `medicalInfo.emergencyContact.name` - Emergency contact name
- `medicalInfo.emergencyContact.phone` - Emergency contact phone

## 🔄 Data Migration

### Running Migrations

```bash
# Dry run to see what would be migrated
npm run migrate:encrypt -- --dry-run

# Migrate all user data
npm run migrate:encrypt

# Verify migration integrity
npm run migrate:verify

# Development only: rollback migration
npm run migrate:rollback
```

### Migration Process

1. **Pre-migration**: Backup existing data
2. **Batch Processing**: Process users in configurable batches (default: 100)
3. **Field Detection**: Automatically detects plaintext vs encrypted fields
4. **Safe Updates**: Uses direct database updates to avoid middleware conflicts
5. **Verification**: Optional verification step to ensure data integrity
6. **Error Handling**: Comprehensive error logging and recovery

### Migration Safety

- **Non-destructive**: Original data is encrypted, not replaced
- **Idempotent**: Can be run multiple times safely
- **Atomic**: Each user update is atomic
- **Reversible**: Rollback capability for development environments
- **Verifiable**: Built-in verification to ensure data integrity

## 🛠️ Usage Examples

### Manual Encryption/Decryption

```typescript
import { encryptionService } from '../services/encryption-service';

// Encrypt sensitive data
const encrypted = await encryptionService.encryptField('John Doe');

// Decrypt when needed
const decrypted = await encryptionService.decryptField(encrypted);

// Batch operations
const encryptedFields = await encryptionService.encryptFields({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

### Working with Encrypted Models

```typescript
// Create user with automatic encryption
const user = new User({
  personalInfo: {
    firstName: 'John',        // Automatically encrypted
    lastName: 'Doe',          // Automatically encrypted
    contact: {
      email: 'john@example.com', // Automatically encrypted
      phone: '+1-555-123-4567'    // Automatically encrypted
    }
  }
});

await user.save(); // Fields encrypted before save

// Retrieve user with automatic decryption
const foundUser = await User.findById(userId);
console.log(foundUser.personalInfo.firstName); // 'John' (decrypted)

// Manual field operations
const decryptedEmail = await foundUser.decryptField('personalInfo.contact.email');
const needsUpdate = foundUser.needsReEncryption('personalInfo.firstName');
```

## 🔧 Key Management

### Development Keys

For development, the service uses environment-based keys with safe defaults. Never use default keys in production.

### Production Key Management

For production deployment on Vercel:

1. **Environment Variables**: Store keys in Vercel environment variables
2. **Key Rotation**: Plan for periodic key rotation using `KEY_ROTATION_ENABLED`
3. **Multiple Environments**: Use different keys for staging/production
4. **Backup Strategy**: Ensure key backup and recovery procedures

### Future Enhancements

The architecture is designed to support:

- **AWS KMS Integration**: Replace environment keys with AWS KMS
- **HashiCorp Vault**: Enterprise key management integration
- **Hardware Security Modules**: For maximum security requirements
- **Automatic Key Rotation**: Scheduled rotation with seamless migration

## 📊 Performance Considerations

### Encryption Overhead

- **Memory**: Encrypted fields use ~1.5x storage vs plaintext
- **CPU**: AES-256-GCM is highly optimized, minimal impact
- **Database**: No impact on query performance for non-encrypted fields
- **Network**: Slightly larger document sizes

### Optimization Strategies

- **Selective Encryption**: Only encrypt truly sensitive fields
- **Batch Operations**: Use batch encrypt/decrypt for multiple fields
- **Connection Pooling**: Reuse database connections for migrations
- **Indexing**: Encrypted fields cannot be indexed (by design)

### Monitoring

Monitor these metrics in production:

- Encryption/decryption operation times
- Failed encryption attempts
- Key rotation events
- Migration progress and errors

## 🧪 Testing

### Test Coverage

- **Unit Tests**: Core encryption/decryption functionality
- **Integration Tests**: Mongoose plugin integration
- **Performance Tests**: Large dataset handling
- **Healthcare Scenarios**: Real-world medical data patterns
- **Migration Tests**: Safe data migration and verification

### Running Tests

```bash
# Run encryption service tests
npm test -- encryption-service

# Run all encryption-related tests
npm test -- encryption

# Performance testing
npm run test:performance
```

## 🔒 Security Considerations

### Threat Model

Protection against:
- **Data at Rest**: Database compromise
- **Data in Transit**: Network interception (with HTTPS)
- **Application Compromise**: Limited exposure of plaintext data
- **Insider Threats**: Reduced access to sensitive data

### Limitations

- **Query Limitations**: Cannot query on encrypted field values
- **Sorting**: Cannot sort by encrypted fields
- **Key Compromise**: If master key is compromised, all data is at risk
- **Performance**: Slight overhead for encryption/decryption operations

### Best Practices

1. **Key Management**: Use proper key management service in production
2. **Access Control**: Limit access to encryption keys
3. **Audit Logging**: Log all key access and encryption operations
4. **Regular Rotation**: Implement key rotation schedule
5. **Monitoring**: Monitor for unusual encryption patterns
6. **Backup**: Secure backup of both data and keys

## 🚦 Deployment to Vercel

### Environment Setup

1. Configure environment variables in Vercel dashboard:
   ```
   ENCRYPTION_MASTER_KEY=<32-character-secure-key>
   ENCRYPTION_SALT=<unique-environment-salt>
   CURRENT_KEY_VERSION=1
   KEY_ROTATION_ENABLED=false
   ```

2. Ensure MongoDB connection string includes proper authentication

3. Run migration before deploying new encrypted model:
   ```bash
   # Local migration to production database
   MONGODB_URI=<prod-connection-string> npm run migrate:encrypt
   ```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Migration verified
- [ ] Backup created
- [ ] Monitoring enabled
- [ ] Error alerting configured

## 📞 Support and Troubleshooting

### Common Issues

1. **Decryption Errors**: Check key version and environment variables
2. **Migration Failures**: Run with smaller batch size
3. **Performance Issues**: Consider selective field encryption
4. **Key Rotation**: Ensure proper version management

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development LOG_LEVEL=debug
```

### Getting Help

- Check test files for usage examples
- Review migration logs for data issues
- Verify environment variable configuration
- Test with small datasets first

---

## 📚 Related Documentation

- [QR Code System Correction](./QR_CODE_SYSTEM_CORRECTION.md)
- [JWT Access Token Upgrade](./JWT_ACCESS_TOKEN_UPGRADE.md)
- [Healthcare Compliance Guide](./prompts/centralized-health-app-knowledge-base.md)

This implementation ensures your healthcare application meets security and compliance requirements while maintaining developer productivity and system performance.
