/**
 * User Role Enumeration
 * Defines all possible user roles in the system
 */
export enum UserRole {
  ADMIN = "admin",
  DOCTOR = "doctor",
  PHARMACIST = "pharmacist",
  PATIENT = "patient",
}

/**
 * Verification Status Enumeration
 * Defines all possible verification states
 */
export enum VerificationStatus {
  PENDING = "pending_verification",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

/**
 * Organization Verification Status
 * Specific to organization verification workflow
 */
export enum OrganizationVerificationStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  ALL = "all",
}

/**
 * Audit Action Types
 * Standardized audit log action types
 */
export enum AuditAction {
  // User actions
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",

  // Admin actions
  ADMIN_USER_CREATED = "ADMIN_USER_CREATED",
  ADMIN_USER_DEACTIVATED = "ADMIN_USER_DEACTIVATED",
  ADMIN_USER_ACTIVATED = "ADMIN_USER_ACTIVATED",
  ADMIN_PASSWORD_RESET = "ADMIN_PASSWORD_RESET",

  // Organization actions
  ORGANIZATION_CREATED = "ORGANIZATION_CREATED",
  ORGANIZATION_VERIFIED = "ORGANIZATION_VERIFIED",
  ORGANIZATION_REJECTED = "ORGANIZATION_REJECTED",

  // System actions
  SYSTEM_BACKUP = "SYSTEM_BACKUP",
  SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE",
}

/**
 * HTTP Status Codes
 * Common HTTP status codes used throughout the application
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * Input Sanitization Rules
 * Type-safe sanitization rules for input validation
 */
export enum SanitizationRule {
  TEXT = "text",
  EMAIL = "email",
  PHONE = "phone",
  URL = "url",
  HTML = "html",
  ALPHANUMERIC = "alphanumeric",
  NUMERIC = "numeric",
  OBJECT_ID = "objectId",
}
