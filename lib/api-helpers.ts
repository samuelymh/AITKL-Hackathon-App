import { NextResponse } from "next/server";

/**
 * Centralized error response creation helper
 */
export function createErrorResponse(
  error: string,
  status: number,
  details?: any,
) {
  return NextResponse.json(
    {
      success: false,
      error: error,
      details,
      timestamp: new Date(),
    },
    { status },
  );
}

/**
 * Centralized success response creation helper
 */
export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date(),
    },
    { status },
  );
}

/**
 * Extract pagination parameters from URL search params
 */
export function extractPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get("limit") || "10")),
    100,
  ); // Max 100 per page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
  skip: number,
) {
  return {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    itemsPerPage: limit,
    hasNext: skip + limit < total,
    hasPrev: page > 1,
  };
}

/**
 * Transform user data for safe API response
 */
export function transformUserForResponse(user: any) {
  return {
    digitalIdentifier: user.digitalIdentifier,
    name: `${user.personalInfo.firstName} ${user.personalInfo.lastName}`,
    age: user.getAge
      ? user.getAge()
      : calculateAge(user.personalInfo.dateOfBirth),
    bloodType: user.medicalInfo?.bloodType,
    hasEmergencyContact: !!user.medicalInfo?.emergencyContact?.name,
    contactVerified: user.isContactVerified ? user.isContactVerified() : false,
    role: user.auth?.role || "patient",
    emailVerified: user.auth?.emailVerified || false,
    phoneVerified: user.auth?.phoneVerified || false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    audit: {
      created: user.auditCreatedDateTime,
      modified: user.auditModifiedDateTime,
      isDeleted: !!user.auditDeletedDateTime,
    },
  };
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[],
): string | null {
  for (const field of requiredFields) {
    if (!body[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Generate consistent query for active (non-deleted) users
 */
export function getActiveUserQuery() {
  return { auditDeletedDateTime: { $exists: false } };
}

/**
 * Rate limiting helper (placeholder for future implementation)
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000,
): boolean {
  // TODO: Implement rate limiting logic with Redis or in-memory store
  // For now, always return true (no rate limiting)
  return true;
}
