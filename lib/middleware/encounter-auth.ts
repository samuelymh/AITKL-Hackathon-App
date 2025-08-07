import { NextRequest } from "next/server";
import AuthorizationGrant, {
  GrantStatus,
} from "@/lib/models/AuthorizationGrant";
import Practitioner from "@/lib/models/Practitioner";
import { AuthorizationError, NotFoundError } from "@/lib/errors/custom-errors";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import mongoose from "mongoose";

export interface AuthorizedContext {
  practitioner: any;
  authGrant: any;
  user: any;
  organization: any;
}

/**
 * Middleware to validate encounter authorization
 * Ensures every encounter operation has proper authorization
 */
export class EncounterAuthMiddleware {
  /**
   * Validate authorization for encounter operations
   *
   * @param request - The incoming request
   * @param practitionerId - ID of the practitioner performing the action
   * @param userId - ID of the patient (for encounter operations)
   * @param organizationId - ID of the organization
   * @param requiredPermission - The specific permission needed
   * @returns AuthorizedContext with validated entities
   */
  static async validateEncounterAuthorization(
    request: NextRequest,
    practitionerId: string,
    userId: string,
    organizationId: string,
    requiredPermission:
      | "canCreateEncounters"
      | "canViewMedicalHistory"
      | "canViewPrescriptions",
  ): Promise<AuthorizedContext> {
    // Step 1: Validate practitioner exists and belongs to organization
    const practitioner = await this.validatePractitioner(
      practitionerId,
      organizationId,
    );

    // Step 2: Find and validate active authorization grant
    const authGrant = await this.validateAuthorizationGrant(
      userId,
      organizationId,
      requiredPermission,
    );

    // Step 3: Validate practitioner permissions
    await this.validatePractitionerPermissions(
      practitioner,
      requiredPermission,
    );

    // Step 4: Log the authorized access for audit
    await this.logAuthorizedAccess(
      request,
      practitioner,
      authGrant,
      requiredPermission,
    );

    // Step 5: Return authorized context
    return {
      practitioner,
      authGrant,
      user: authGrant.userId,
      organization: authGrant.organizationId,
    };
  }

  /**
   * Validate practitioner exists and belongs to the organization
   */
  private static async validatePractitioner(
    practitionerId: string,
    organizationId: string,
  ) {
    const practitioner =
      await Practitioner.findById(practitionerId).populate("organizationId");

    if (!practitioner) {
      throw new NotFoundError("Practitioner not found");
    }

    // Check if practitioner belongs to the organization
    if (practitioner.organizationId._id.toString() !== organizationId) {
      throw new AuthorizationError(
        "Practitioner does not belong to the specified organization",
      );
    }

    // Check if practitioner account is active
    if (!practitioner.metadata?.isActive) {
      throw new AuthorizationError("Practitioner account is not active");
    }

    return practitioner;
  }

  /**
   * Find and validate active authorization grant
   */
  private static async validateAuthorizationGrant(
    userId: string,
    organizationId: string,
    requiredPermission: string,
  ) {
    const authGrant = await AuthorizationGrant.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      "grantDetails.status": GrantStatus.ACTIVE,
      "grantDetails.expiresAt": { $gt: new Date() },
      auditDeletedDateTime: { $exists: false },
    }).populate(["userId", "organizationId"]);

    if (!authGrant) {
      throw new AuthorizationError(
        "No active authorization grant found for this patient and organization",
      );
    }

    // Check if grant has expired
    if (authGrant.isExpired()) {
      throw new AuthorizationError("Authorization grant has expired");
    }

    // Check if grant has the required permission
    if (
      !authGrant.hasPermission(
        this.mapPermissionToGrantScope(requiredPermission),
      )
    ) {
      throw new AuthorizationError(
        `Authorization grant does not include permission: ${requiredPermission}`,
      );
    }

    return authGrant;
  }

  /**
   * Validate practitioner has the required permissions
   */
  private static async validatePractitionerPermissions(
    practitioner: any,
    requiredPermission: string,
  ) {
    switch (requiredPermission) {
      case "canCreateEncounters":
        if (!practitioner.permissions?.canCreateEncounters) {
          throw new AuthorizationError(
            "Practitioner does not have permission to create encounters",
          );
        }
        break;
      case "canViewMedicalHistory":
        if (!practitioner.permissions?.canViewMedicalHistory) {
          throw new AuthorizationError(
            "Practitioner does not have permission to view medical history",
          );
        }
        break;
      case "canViewPrescriptions":
        if (!practitioner.permissions?.canViewPrescriptions) {
          throw new AuthorizationError(
            "Practitioner does not have permission to view prescriptions",
          );
        }
        break;
      default:
        throw new AuthorizationError(
          `Unknown permission: ${requiredPermission}`,
        );
    }
  }

  /**
   * Log the authorized access for audit purposes
   */
  private static async logAuthorizedAccess(
    request: NextRequest,
    practitioner: any,
    authGrant: any,
    requiredPermission: string,
  ) {
    await auditLogger.logSecurityEvent(
      SecurityEventType.DATA_ACCESS,
      request,
      authGrant.userId._id.toString(),
      {
        action: "ENCOUNTER_ACCESS_AUTHORIZED",
        practitionerId: practitioner._id.toString(),
        organizationId: authGrant.organizationId._id.toString(),
        authorizationGrantId: authGrant._id.toString(),
        requiredPermission,
        grantExpiresAt: authGrant.grantDetails.expiresAt,
      },
    );
  }

  /**
   * Map API permissions to authorization grant scope
   */
  private static mapPermissionToGrantScope(permission: string): string {
    const mapping: Record<string, string> = {
      canCreateEncounters: "createEncounters",
      canViewMedicalHistory: "viewMedicalHistory",
      canViewPrescriptions: "viewPrescriptions",
    };

    return mapping[permission] || permission;
  }

  /**
   * Validate encounter belongs to the authorized context
   */
  static async validateEncounterAccess(
    encounterId: string,
    authorizedContext: AuthorizedContext,
  ): Promise<any> {
    const Encounter = (await import("@/lib/models/Encounter")).default;

    const encounter = await Encounter.findById(encounterId).populate([
      "userId",
      "organizationId",
      "attendingPractitionerId",
    ]);

    if (!encounter) {
      throw new NotFoundError("Encounter not found");
    }

    // Verify encounter belongs to the same patient
    if (
      encounter.userId._id.toString() !==
      authorizedContext.authGrant.userId._id.toString()
    ) {
      throw new AuthorizationError(
        "Encounter does not belong to the authorized patient",
      );
    }

    // Verify encounter belongs to the same organization
    if (
      encounter.organizationId._id.toString() !==
      authorizedContext.authGrant.organizationId._id.toString()
    ) {
      throw new AuthorizationError(
        "Encounter does not belong to the authorized organization",
      );
    }

    return encounter;
  }

  /**
   * Quick authorization check for read-only operations
   */
  static async quickAuthCheck(
    practitionerId: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      // Check for active grant
      const authGrant = await AuthorizationGrant.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        organizationId: new mongoose.Types.ObjectId(organizationId),
        "grantDetails.status": GrantStatus.ACTIVE,
        "grantDetails.expiresAt": { $gt: new Date() },
        auditDeletedDateTime: { $exists: false },
      });

      if (!authGrant) {
        return false;
      }

      // Check practitioner belongs to organization
      const practitioner = await Practitioner.findById(practitionerId);
      if (
        !practitioner ||
        practitioner.organizationId.toString() !== organizationId
      ) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Quick auth check failed:", error);
      return false;
    }
  }
}

/**
 * Express-style middleware wrapper for Next.js API routes
 */
export function withEncounterAuth(
  requiredPermission:
    | "canCreateEncounters"
    | "canViewMedicalHistory"
    | "canViewPrescriptions",
) {
  return async function (
    request: NextRequest,
    practitionerId: string,
    userId: string,
    organizationId: string,
  ): Promise<AuthorizedContext> {
    return await EncounterAuthMiddleware.validateEncounterAuthorization(
      request,
      practitionerId,
      userId,
      organizationId,
      requiredPermission,
    );
  };
}
