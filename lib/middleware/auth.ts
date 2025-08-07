import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, UserRole, AuthErrors } from "@/lib/auth";
import { createErrorResponse } from "@/lib/api-helpers";

/**
 * Authentication middleware for API routes
 * Validates JWT tokens and enforces role-based access control
 */
export function withAuth(
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
  options: {
    allowedRoles?: UserRole[];
    requireAuth?: boolean;
  } = {},
) {
  const { allowedRoles, requireAuth: authRequired = true } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract authentication context
      const authContext = getAuthContext(request);

      // Check if authentication is required
      if (authRequired) {
        const authCheck = requireAuth(allowedRoles);
        const authResult = authCheck(authContext);

        if (!authResult.success) {
          return createErrorResponse(
            authResult.error || AuthErrors.INVALID_TOKEN,
            authResult.status || 401,
          );
        }
      }

      // Call the actual handler with auth context
      return await handler(request, authContext);
    } catch (error) {
      console.error("Authentication middleware error:", error);
      return createErrorResponse("Authentication error", 500);
    }
  };
}

/**
 * Role-specific middleware wrappers
 */
// TODO: Consider middleware for organization as well
export const withAdminAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) => withAuth(handler, { allowedRoles: [UserRole.ADMIN] });

export const withDoctorAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) => withAuth(handler, { allowedRoles: [UserRole.DOCTOR, UserRole.ADMIN] });

export const withPharmacistAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) => withAuth(handler, { allowedRoles: [UserRole.PHARMACIST, UserRole.ADMIN] });

export const withMedicalStaffAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) =>
  withAuth(handler, {
    allowedRoles: [UserRole.DOCTOR, UserRole.PHARMACIST, UserRole.ADMIN],
  });

export const withAnyAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) => withAuth(handler, { requireAuth: true });

/**
 * Optional authentication middleware (for public routes that can benefit from auth context)
 */
export const withOptionalAuth = (
  handler: (request: NextRequest, authContext: any) => Promise<NextResponse>,
) => withAuth(handler, { requireAuth: false });
