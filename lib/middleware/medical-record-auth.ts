import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { getAuthContext } from "@/lib/auth";

/**
 * Authorization middleware for medical record access
 * Validates that the requester has an active authorization grant with proper permissions
 */
export class MedicalRecordAuthMiddleware {
  /**
   * Validate access to medical records
   */
  static async validateMedicalRecordAccess(
    request: NextRequest,
    patientId: string,
    organizationId: string,
    requiredPermission: "viewMedicalHistory" | "viewPrescriptions" | "createEncounters" | "viewAuditLogs"
  ): Promise<{ isAuthorized: boolean; authGrant?: any; error?: string }> {
    try {
      await connectToDatabase();

      // Get auth context
      const authContext = getAuthContext(request);
      if (!authContext?.isAuthenticated) {
        return { isAuthorized: false, error: "Authentication required" };
      }

      // Find active authorization grant
      const authGrant = await AuthorizationGrant.findOne({
        userId: patientId,
        organizationId: organizationId,
        "grantDetails.status": "ACTIVE",
        "grantDetails.expiresAt": { $gt: new Date() },
        auditDeletedDateTime: { $exists: false },
      });

      if (!authGrant) {
        return {
          isAuthorized: false,
          error: "No active authorization grant found for this patient and organization",
        };
      }

      // Check if grant has expired
      if (authGrant.isExpired()) {
        return {
          isAuthorized: false,
          error: "Authorization grant has expired",
        };
      }

      // Check specific permission
      if (!authGrant.hasPermission(requiredPermission)) {
        return {
          isAuthorized: false,
          error: `Authorization grant does not include permission: ${requiredPermission}`,
        };
      }

      return {
        isAuthorized: true,
        authGrant: authGrant,
      };
    } catch (error) {
      console.error("Error validating medical record access:", error);
      return {
        isAuthorized: false,
        error: `Failed to validate authorization: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Middleware wrapper for medical record endpoints
   */
  static withMedicalRecordAuth(
    handler: (request: NextRequest, authGrant: any, ...args: any[]) => Promise<NextResponse>,
    requiredPermission: "viewMedicalHistory" | "viewPrescriptions" | "createEncounters" | "viewAuditLogs"
  ) {
    return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
      try {
        // Extract patientId and organizationId from request
        // This could come from URL params, query params, or request body
        const { patientId, organizationId } = await this.extractAuthParams(request);

        if (!patientId || !organizationId) {
          return NextResponse.json({ error: "Patient ID and Organization ID are required" }, { status: 400 });
        }

        // Validate authorization
        const authResult = await this.validateMedicalRecordAccess(
          request,
          patientId,
          organizationId,
          requiredPermission
        );

        if (!authResult.isAuthorized) {
          return NextResponse.json({ error: authResult.error || "Access denied" }, { status: 403 });
        }

        // Call the handler with the validated auth grant
        return await handler(request, authResult.authGrant, ...args);
      } catch (error) {
        console.error("Medical record authorization middleware error:", error);
        return NextResponse.json({ error: "Authorization validation failed" }, { status: 500 });
      }
    };
  }

  /**
   * Simplified parameter extraction from request
   */
  private static async extractAuthParams(request: NextRequest): Promise<{
    patientId?: string;
    organizationId?: string;
  }> {
    try {
      const url = new URL(request.url);

      // Extract from query parameters
      const patientId = url.searchParams.get("patientId") || url.searchParams.get("userId");
      const organizationId = url.searchParams.get("organizationId");

      return {
        patientId: patientId || undefined,
        organizationId: organizationId || undefined,
      };
    } catch (error) {
      console.error("Error extracting auth parameters:", error);
      return {};
    }
  }

  /**
   * Quick check if user has any active grants with an organization
   */
  static async hasActiveGrant(patientId: string, organizationId: string): Promise<boolean> {
    try {
      await connectToDatabase();

      const activeGrant = await AuthorizationGrant.findOne({
        userId: patientId,
        organizationId: organizationId,
        "grantDetails.status": "ACTIVE",
        "grantDetails.expiresAt": { $gt: new Date() },
        auditDeletedDateTime: { $exists: false },
      });

      return !!activeGrant && !activeGrant.isExpired();
    } catch (error) {
      console.error("Error checking active grant:", error);
      return false;
    }
  }
}

// Export convenience functions
export const withViewMedicalHistory = (handler: any) =>
  MedicalRecordAuthMiddleware.withMedicalRecordAuth(handler, "viewMedicalHistory");

export const withViewPrescriptions = (handler: any) =>
  MedicalRecordAuthMiddleware.withMedicalRecordAuth(handler, "viewPrescriptions");

export const withCreateEncounters = (handler: any) =>
  MedicalRecordAuthMiddleware.withMedicalRecordAuth(handler, "createEncounters");

export const withViewAuditLogs = (handler: any) =>
  MedicalRecordAuthMiddleware.withMedicalRecordAuth(handler, "viewAuditLogs");
