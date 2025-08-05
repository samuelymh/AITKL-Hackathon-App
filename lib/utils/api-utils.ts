import { NextRequest } from "next/server";

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

/**
 * Extract client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const clientIP = request.headers.get("x-client-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || clientIP || "unknown";
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") || "unknown";
}
