import { getClientIP, getUserAgent } from "./network";

// Re-export network utilities for backward compatibility
export { getClientIP, getUserAgent };

/**
 * Extract and validate required authentication parameters from URL search params
 */
export function extractAndValidateAuthParams(searchParams: URLSearchParams): {
  practitionerId: string;
  userId: string;
  organizationId: string;
} {
  const practitionerId = searchParams.get("practitionerId");
  const userId = searchParams.get("userId");
  const organizationId = searchParams.get("organizationId");

  if (!practitionerId || !userId || !organizationId) {
    throw new Error("practitionerId, userId, and organizationId are required query parameters");
  }

  return { practitionerId, userId, organizationId };
}

/**
 * Extract authentication parameters from request body
 */
export function extractAuthParamsFromBody(body: any): {
  practitionerId: string;
  userId: string;
  organizationId: string;
} {
  const { practitionerId, userId, organizationId } = body;

  if (!practitionerId || !userId || !organizationId) {
    throw new Error("practitionerId, userId, and organizationId are required in request body");
  }

  return { practitionerId, userId, organizationId };
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate all auth params are valid ObjectIds
 */
export function validateAuthParamFormat(params: {
  practitionerId: string;
  userId: string;
  organizationId: string;
}): void {
  const { practitionerId, userId, organizationId } = params;

  if (!isValidObjectId(practitionerId)) {
    throw new Error("Invalid practitionerId format");
  }
  if (!isValidObjectId(userId)) {
    throw new Error("Invalid userId format");
  }
  if (!isValidObjectId(organizationId)) {
    throw new Error("Invalid organizationId format");
  }
}
