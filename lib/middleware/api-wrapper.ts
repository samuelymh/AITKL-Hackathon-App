import { NextRequest, NextResponse } from "next/server";
import {
  EncounterAuthMiddleware,
  AuthorizedContext,
} from "@/lib/middleware/encounter-auth";
import { createErrorResponse } from "@/lib/api-helpers";
import {
  extractAndValidateAuthParams,
  validateAuthParamFormat,
} from "@/lib/utils/api-utils";
import {
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors/custom-errors";

type RouteHandler = (
  req: NextRequest,
  context: { params: { encounterId?: string } },
  authorizedContext: AuthorizedContext,
) => Promise<NextResponse>;

type RouteHandlerWithBody = (
  req: NextRequest,
  context: { params: { encounterId?: string } },
  authorizedContext: AuthorizedContext,
  body: any,
) => Promise<NextResponse>;

/**
 * Higher-order function to wrap API routes with authentication and authorization
 * Eliminates code duplication across encounter endpoints
 */
export const withEncounterAuth = (
  handler: RouteHandler,
  permission:
    | "canCreateEncounters"
    | "canViewMedicalHistory"
    | "canViewPrescriptions",
) => {
  return async (
    req: NextRequest,
    context: { params: { encounterId?: string } },
  ) => {
    try {
      const { searchParams } = new URL(req.url);

      // Extract and validate auth parameters
      let authParams;
      try {
        authParams = extractAndValidateAuthParams(searchParams);
        validateAuthParamFormat(authParams);
      } catch (error: any) {
        return createErrorResponse(error.message, 400);
      }

      const { practitionerId, userId, organizationId } = authParams;

      // Validate authorization
      const authorizedContext =
        await EncounterAuthMiddleware.validateEncounterAuthorization(
          req,
          practitionerId,
          userId,
          organizationId,
          permission,
        );

      return handler(req, context, authorizedContext);
    } catch (error: any) {
      console.error("Error in withEncounterAuth:", error);

      if (error instanceof ValidationError) {
        return createErrorResponse(error.message, 400);
      }

      if (error instanceof AuthorizationError) {
        return createErrorResponse(error.message, 403);
      }

      if (error instanceof NotFoundError) {
        return createErrorResponse(error.message, 404);
      }

      return createErrorResponse(error.message || "Authentication failed", 500);
    }
  };
};

/**
 * Higher-order function for routes that need request body parsing
 */
export const withEncounterAuthAndBody = (
  handler: RouteHandlerWithBody,
  permission:
    | "canCreateEncounters"
    | "canViewMedicalHistory"
    | "canViewPrescriptions",
) => {
  return async (
    req: NextRequest,
    context: { params: { encounterId?: string } },
  ) => {
    try {
      // Parse body first
      const body = await req.json();

      // For POST/PUT routes, auth params might come from body
      let authParams;
      try {
        if (req.method === "GET") {
          const { searchParams } = new URL(req.url);
          authParams = extractAndValidateAuthParams(searchParams);
        } else {
          // For POST/PUT, extract from body
          const { practitionerId, userId, organizationId } = body;
          if (!practitionerId || !userId || !organizationId) {
            throw new Error(
              "practitionerId, userId, and organizationId are required in request body",
            );
          }
          authParams = { practitionerId, userId, organizationId };
        }
        validateAuthParamFormat(authParams);
      } catch (error: any) {
        return createErrorResponse(error.message, 400);
      }

      const { practitionerId, userId, organizationId } = authParams;

      // Validate authorization
      const authorizedContext =
        await EncounterAuthMiddleware.validateEncounterAuthorization(
          req,
          practitionerId,
          userId,
          organizationId,
          permission,
        );

      return handler(req, context, authorizedContext, body);
    } catch (error: any) {
      console.error("Error in withEncounterAuthAndBody:", error);

      if (error instanceof ValidationError) {
        return createErrorResponse(error.message, 400);
      }

      if (error instanceof AuthorizationError) {
        return createErrorResponse(error.message, 403);
      }

      if (error instanceof NotFoundError) {
        return createErrorResponse(error.message, 404);
      }

      return createErrorResponse(error.message || "Authentication failed", 500);
    }
  };
};
