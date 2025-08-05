import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/auth";
import connectToDatabase from "@/lib/db.connection";
import Organization from "@/lib/models/Organization";

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
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Build filter based on verification status
    const filter: any = {
      auditDeletedDateTime: { $exists: false },
    };

    if (status === "pending") {
      filter["verification.isVerified"] = false;
    } else if (status === "verified") {
      filter["verification.isVerified"] = true;
    }

    // Get organizations with pagination
    const organizations = await Organization.find(filter)
      .select(
        "organizationInfo.name organizationInfo.type organizationInfo.registrationNumber address verification contact"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Organization.countDocuments(filter);

    // Format response
    const formattedOrganizations = organizations.map((org) => ({
      id: org._id,
      name: org.organizationInfo.name,
      type: org.organizationInfo.type,
      registrationNumber: org.organizationInfo.registrationNumber,
      address: `${org.address.city}, ${org.address.state}`,
      contact: {
        email: org.contact.email,
        phone: org.contact.phone,
      },
      verification: {
        isVerified: org.verification.isVerified,
        verifiedAt: org.verification.verifiedAt,
        verificationNotes: org.verification.verificationNotes,
      },
      submittedAt: org.auditCreatedDateTime,
    }));

    return NextResponse.json({
      success: true,
      data: {
        organizations: formattedOrganizations,
        pagination: {
          current: page,
          total: Math.ceil(totalCount / limit),
          count: formattedOrganizations.length,
          totalCount,
        },
      },
    });
  } catch (error) {
    console.error("Verification list error:", error);
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

    const validatedDecision = verificationDecisionSchema.parse(decisionData);

    await connectToDatabase();

    // Find organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 });
    }

    // Update verification status
    const now = new Date();
    const adminId = authContext.user.userId;

    if (validatedDecision.action === "verify") {
      organization.verification = {
        ...organization.verification,
        isVerified: true,
        verifiedAt: now,
        verificationNotes: validatedDecision.notes || "Verified by admin",
      };
    } else {
      const rejectionMessage = `Rejected: ${validatedDecision.rejectionReason}`;
      const fullMessage = validatedDecision.notes
        ? `${rejectionMessage}. Notes: ${validatedDecision.notes}`
        : rejectionMessage;

      organization.verification = {
        ...organization.verification,
        isVerified: false,
        verifiedAt: undefined,
        verificationNotes: fullMessage,
      };
    }

    // Update audit fields
    organization.auditModifiedBy = adminId;
    organization.auditModifiedDateTime = now.toISOString();

    await organization.save();

    // TODO: Send notification email to organization contact
    // await sendVerificationNotification(organization, validatedDecision.action);

    return NextResponse.json({
      success: true,
      message: `Organization ${validatedDecision.action === "verify" ? "verified" : "rejected"} successfully`,
      data: {
        organizationId: organization._id,
        name: organization.organizationInfo.name,
        status: validatedDecision.action,
        verifiedAt: organization.verification.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Verification decision error:", error);

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
