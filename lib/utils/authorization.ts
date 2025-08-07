import { UserRole } from "@/lib/auth";

export interface Permission {
  resource: string;
  action: string;
}

export interface AuthContext {
  user: {
    id: string;
    auth: {
      role: UserRole;
    };
    permissions?: string[];
  };
}

export class AuthorizationService {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(authContext: AuthContext, permission: string): boolean {
    const { user } = authContext;

    // Admin has all permissions
    if (user.auth.role === UserRole.ADMIN) {
      return true;
    }

    // Check explicit permissions
    if (user.permissions?.includes(permission)) {
      return true;
    }

    // Role-based permissions
    return this.hasRolePermission(user.auth.role, permission);
  }

  /**
   * Check if user role has permission for specific actions
   */
  private static hasRolePermission(
    role: UserRole,
    permission: string,
  ): boolean {
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ["*"], // Admin has all permissions
      [UserRole.SYSTEM]: ["*"], // System has all permissions
      [UserRole.DOCTOR]: [
        "read:organizations",
        "create:organizationMember",
        "read:patients",
        "create:prescriptions",
        "read:prescriptions",
        "update:prescriptions",
      ],
      [UserRole.PHARMACIST]: [
        "read:organizations",
        "create:organizationMember",
        "read:prescriptions",
        "update:prescriptions",
        "dispense:medications",
      ],
      [UserRole.PATIENT]: [
        "read:own-data",
        "update:own-profile",
        "share:medical-records",
      ],
    };

    const permissions = rolePermissions[role] || [];
    return permissions.includes("*") || permissions.includes(permission);
  }

  /**
   * Check if user can create organization membership
   */
  static canCreateOrganizationMember(authContext: AuthContext): boolean {
    return this.hasPermission(authContext, "create:organizationMember");
  }

  /**
   * Check if user can verify organizations (admin only)
   */
  static canVerifyOrganizations(authContext: AuthContext): boolean {
    return authContext.user.auth.role === UserRole.ADMIN;
  }

  /**
   * Check if user can access admin endpoints
   */
  static isAdmin(authContext: AuthContext): boolean {
    return authContext.user.auth.role === UserRole.ADMIN;
  }

  /**
   * Check if user can access healthcare professional features
   */
  static isHealthcareProfessional(authContext: AuthContext): boolean {
    const { role } = authContext.user.auth;
    return role === UserRole.DOCTOR || role === UserRole.PHARMACIST;
  }

  /**
   * Check if user can access organization data
   */
  static canAccessOrganization(
    authContext: AuthContext,
    organizationId: string,
  ): boolean {
    // Admin can access all organizations
    if (this.isAdmin(authContext)) {
      return true;
    }

    // For now, all healthcare professionals can see organizations
    // In a more complex system, you might check if user is a member of the organization
    return this.isHealthcareProfessional(authContext);
  }

  /**
   * Validate organization membership permissions
   */
  static validateOrganizationMembershipCreate(
    authContext: AuthContext,
    organizationId: string,
    targetUserId: string,
  ): { authorized: boolean; error?: string } {
    // User can only create membership for themselves during registration
    if (authContext.user.id !== targetUserId) {
      return {
        authorized: false,
        error: "Cannot create organization membership for another user",
      };
    }

    // Check if user has permission to create organization memberships
    if (!this.canCreateOrganizationMember(authContext)) {
      return {
        authorized: false,
        error: "Insufficient permissions to create organization membership",
      };
    }

    return { authorized: true };
  }
}

/**
 * Middleware function to check authorization
 */
export function requirePermission(permission: string) {
  return (
    authContext: AuthContext,
  ): { authorized: boolean; error?: string } => {
    if (!AuthorizationService.hasPermission(authContext, permission)) {
      return {
        authorized: false,
        error: `Missing required permission: ${permission}`,
      };
    }
    return { authorized: true };
  };
}

/**
 * Middleware function to require admin role
 */
export function requireAdmin() {
  return (
    authContext: AuthContext,
  ): { authorized: boolean; error?: string } => {
    if (!AuthorizationService.isAdmin(authContext)) {
      return {
        authorized: false,
        error: "Admin access required",
      };
    }
    return { authorized: true };
  };
}
