import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// User roles for authorization
export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  PHARMACIST = "pharmacist",
  ADMIN = "admin",
  SYSTEM = "system",
}

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  digitalIdentifier: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

// Authentication context for audit logging
export interface AuthContext {
  userId: string;
  digitalIdentifier: string;
  role: UserRole;
  email: string;
  isAuthenticated: boolean;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify JWT token and return payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extract authentication context from NextRequest
 */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    digitalIdentifier: payload.digitalIdentifier,
    role: payload.role,
    email: payload.email,
    isAuthenticated: true,
  };
}

/**
 * Get current user ID from request context for audit logging
 */
export function getCurrentUserId(request?: NextRequest): string {
  if (!request) {
    return "system";
  }

  const authContext = getAuthContext(request);
  return authContext?.userId || "anonymous";
}

/**
 * Middleware to check if user is authenticated
 */
export function requireAuth(allowedRoles?: UserRole[]) {
  return (authContext: AuthContext | null) => {
    if (!authContext?.isAuthenticated) {
      return { success: false, error: "Authentication required", status: 401 };
    }

    if (allowedRoles && !allowedRoles.includes(authContext.role)) {
      return { success: false, error: "Insufficient permissions", status: 403 };
    }

    return { success: true };
  };
}

/**
 * Create system authentication context for internal operations
 */
export function createSystemAuthContext(): AuthContext {
  return {
    userId: "system",
    digitalIdentifier: "SYSTEM_USER",
    role: UserRole.SYSTEM,
    email: "system@internal.app",
    isAuthenticated: true,
  };
}

/**
 * Validate user role permissions for specific operations
 */
export function hasPermission(userRole: UserRole, operation: string, resource: string): boolean {
  const permissions: Record<UserRole, Record<string, string[]>> = {
    [UserRole.ADMIN]: {
      "*": ["*"], // Admin has all permissions
    },
    [UserRole.DOCTOR]: {
      users: ["read", "update"],
      prescriptions: ["create", "read", "update"],
      medical_records: ["create", "read", "update"],
    },
    [UserRole.PHARMACIST]: {
      prescriptions: ["read", "update"],
      medications: ["read", "update"],
    },
    [UserRole.PATIENT]: {
      users: ["read", "update"], // Can only update own profile
      medical_records: ["read"], // Can only read own records
      prescriptions: ["read"], // Can only read own prescriptions
    },
    [UserRole.SYSTEM]: {
      "*": ["*"], // System has all permissions
    },
  };

  const userPermissions = permissions[userRole];
  if (!userPermissions) return false;

  // Check if user has global permissions
  if (userPermissions["*"]?.includes("*")) return true;

  // Check resource-specific permissions
  const resourcePermissions = userPermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(operation) || resourcePermissions.includes("*");
}

/**
 * Error responses for authentication failures
 */
export const AuthErrors = {
  INVALID_TOKEN: "Invalid or expired token",
  MISSING_TOKEN: "Authorization token required",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this operation",
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  EMAIL_ALREADY_EXISTS: "Email already registered",
} as const;
