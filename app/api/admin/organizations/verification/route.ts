import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/auth";
import { logger } from "@/lib/logger";
import { OrganizationService } from "@/lib/services/organizationService";
import { InputSanitizer } from "@/lib/utils/input-sanitizer";
import { HttpStatus, OrganizationVerificationStatus } from "@/lib/types/enums";

// Validation schema for verification decision
const verificationDecisionSchema = z
  .object({
    action: z.enum(["verify", "reject"]),
    notes: z.string().max(1000).optional(),
    rejectionReason: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      // If rejecting, reason is required
      if (data.action === "reject") {
        return data.rejectionReason && data.rejectionReason.length > 0;
      }
      return true;
    },
    {
      message: "Rejection reason is required when rejecting an organization",
      path: ["rejectionReason"],
    }
  );

/**
 * GET /api/admin/organizations/verification - List organizations pending verification
 */
async function getHandler(request: NextRequest, authContext: any) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate and sanitize query parameters
    const rawStatus = searchParams.get("status") || OrganizationVerificationStatus.PENDING;
    const status = InputSanitizer.sanitizeText(rawStatus);

    // Validate status is one of allowed values
    if (!Object.values(OrganizationVerificationStatus).includes(status as OrganizationVerificationStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid status parameter" },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);

    // Log admin access for audit
    logger.info(`Admin ${authContext.user.userId} accessing organization verification list`, {
      status,
      page,
      limit,
      adminId: authContext.user.userId,
    });

    const result = await OrganizationService.getOrganizationsForVerification(status, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Verification list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve organizations for verification",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/admin/organizations/verification - Process verification decision
 */
async function postHandler(request: NextRequest, authContext: any) {
  try {
    const body = await request.json();
    const { organizationId, ...decisionData } = body;

    // Validate request
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    // Sanitize organization ID
    const sanitizedOrgId = InputSanitizer.sanitizeObjectId(organizationId);
    if (!sanitizedOrgId) {
      return NextResponse.json(
        { success: false, error: "Invalid organization ID format" },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    // Sanitize decision data with type-safe rules
    const sanitizedDecisionData = InputSanitizer.sanitizeObject(decisionData, {
      notes: "text" as any,
      rejectionReason: "text" as any,
    });

    const validatedDecision = verificationDecisionSchema.parse(sanitizedDecisionData);

    // Log admin action for audit
    logger.info(`Admin ${authContext.user.userId} processing organization verification`, {
      organizationId: sanitizedOrgId,
      action: validatedDecision.action,
      adminId: authContext.user.userId,
      hasNotes: !!validatedDecision.notes,
      hasRejectionReason: !!validatedDecision.rejectionReason,
    });

    const result = await OrganizationService.processVerificationDecision(
      sanitizedOrgId,
      validatedDecision.action,
      authContext.user.userId,
      validatedDecision.notes,
      validatedDecision.rejectionReason
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        organizationId: sanitizedOrgId,
        status: validatedDecision.action,
      },
    });
  } catch (error) {
    logger.error("Verification decision error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid verification decision data",
          details: error.errors,
        },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    if (error instanceof Error && error.message === "Organization not found") {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: HttpStatus.NOT_FOUND });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process verification decision",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

// Apply admin authentication
export const GET = withAdminAuth(getHandler);
export const POST = withAdminAuth(postHandler);
