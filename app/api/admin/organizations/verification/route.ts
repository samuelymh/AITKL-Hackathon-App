import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/auth";
import { logger } from "@/lib/logger";
import { OrganizationService } from "@/lib/services/organizationService";
import { InputSanitizer } from "@/lib/utils/input-sanitizer";

// Validation schema for verification decision
const verificationDecisionSchema = z
  .object({
    action: z.enum(["verify", "reject"]),
    notes: z.string().optional(),
    rejectionReason: z.string().optional(),
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
    const status = InputSanitizer.sanitizeText(searchParams.get("status") || "pending");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);

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
      { status: 500 }
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
      return NextResponse.json({ success: false, error: "Organization ID is required" }, { status: 400 });
    }

    // Sanitize organization ID
    const sanitizedOrgId = InputSanitizer.sanitizeObjectId(organizationId);
    if (!sanitizedOrgId) {
      return NextResponse.json({ success: false, error: "Invalid organization ID format" }, { status: 400 });
    }

    // Sanitize decision data
    const sanitizedDecisionData = InputSanitizer.sanitizeObject(decisionData, {
      notes: "text",
      rejectionReason: "text",
    });

    const validatedDecision = verificationDecisionSchema.parse(sanitizedDecisionData);

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
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Organization not found") {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process verification decision",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Apply admin authentication
export const GET = withAdminAuth(getHandler);
export const POST = withAdminAuth(postHandler);
