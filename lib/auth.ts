import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // Extended for testing (was 15m)
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // Long-lived refresh token

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
  tokenVersion?: number; // For token rotation
  iat?: number;
  exp?: number;
}

// Refresh token payload
export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
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
 * Generate JWT access token for authenticated user
 */
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
): string {
  // Add security claims
  const securePayload = {
    ...payload,
    tokenVersion: payload.tokenVersion || 1,
    iss: process.env.JWT_ISSUER || "health-app",
    aud: process.env.JWT_AUDIENCE || "health-app-users",
  };

  return jwt.sign(securePayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  } as jwt.SignOptions);
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  userId: string,
  tokenVersion: number = 1,
): string {
  const payload: RefreshTokenPayload = {
    userId,
    tokenVersion,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: "HS256",
  } as jwt.SignOptions);
}

/**
 * Verify JWT access token and return payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER || "health-app",
      audience: process.env.JWT_AUDIENCE || "health-app-users",
    }) as JWTPayload;

    // Validate required claims
    if (!payload.userId || !payload.role || !payload.email) {
      console.error("JWT missing required claims");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

/**
 * Verify refresh token and return payload
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    }) as RefreshTokenPayload;
  } catch (error) {
    console.error("Refresh token verification failed:", error);
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
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
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
  return (
    authContext: AuthContext | null,
  ): { success: true } | { success: false; error: string; status: number } => {
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
export function hasPermission(
  userRole: UserRole,
  operation: string,
  resource: string,
): boolean {
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

  return (
    resourcePermissions.includes(operation) || resourcePermissions.includes("*")
  );
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
