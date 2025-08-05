import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant, { GrantStatus } from "@/lib/models/AuthorizationGrant";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";

/**
 * GET /api/qr/[grantId]
 * Generate and return QR code for authorization grant
 *
 * NOTE: This endpoint may not align with the knowledge base specification.
 * According to the knowledge base, patient QR codes should only contain the digital identifier.
 * This endpoint appears to be for a different use case.
 */
export async function GET(request: NextRequest, { params }: { params: { grantId: string } }) {
  try {
    await connectToDatabase();

    const { grantId } = params;

    // Find the authorization grant
    const authGrant = await AuthorizationGrant.findById(grantId);
    if (!authGrant) {
      return NextResponse.json({ error: "Authorization grant not found" }, { status: 404 });
    }

    // Check if grant is valid for QR code generation
    if (authGrant.grantDetails.status !== GrantStatus.ACTIVE) {
      return NextResponse.json(
        {
          error: "QR code can only be generated for active grants",
          status: authGrant.grantDetails.status,
        },
        { status: 400 }
      );
    }

    // Check if grant is expired
    if (authGrant.isExpired()) {
      return NextResponse.json({ error: "Cannot generate QR code for expired grant" }, { status: 400 });
    }

    // Log the attempt
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authGrant.userId.toString(), {
      action: "QR_CODE_GENERATION_REQUESTED",
      grantId: authGrant._id.toString(),
      note: "This endpoint may not align with knowledge base specification",
    });

    return NextResponse.json(
      {
        message: "This endpoint is under review for compliance with knowledge base specification",
        grantId: authGrant._id.toString(),
        status: authGrant.grantDetails.status,
      },
      { status: 501 } // Not Implemented
    );
  } catch (error) {
    console.error("Error in QR code generation endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/qr/[grantId]
 * Validate and process scanned QR code
 *
 * NOTE: This endpoint may not align with the knowledge base specification.
 * According to the knowledge base, QR codes should only contain the digital identifier,
 * and the authorization flow should go through /api/v1/authorizations/request
 */
export async function POST(request: NextRequest, { params }: { params: { grantId: string } }) {
  try {
    await connectToDatabase();

    const { grantId } = params;
    const body = await request.json();
    const { scannedData, scannedBy } = body;

    if (!scannedData || !scannedBy) {
      return NextResponse.json({ error: "Missing scannedData or scannedBy" }, { status: 400 });
    }

    // Try to validate as patient QR code (per knowledge base)
    const patientQRData = QRCodeService.validatePatientQRCode(scannedData);
    if (patientQRData) {
      return NextResponse.json(
        {
          message: "This appears to be a patient QR code. Please use /api/v1/authorizations/request endpoint instead.",
          digitalIdentifier: patientQRData.digitalIdentifier,
          suggestedEndpoint: "/api/v1/authorizations/request",
        },
        { status: 400 }
      );
    }

    // Find and validate the grant
    const authGrant = await AuthorizationGrant.findById(grantId)
      .populate("userId", "digitalIdentifier personalInfo.firstName personalInfo.lastName")
      .populate({
        path: "organizationId",
        select: "organizationInfo.name organizationInfo.type address",
      })
      .populate({
        path: "requestingPractitionerId",
        select: "userId professionalInfo.specialty professionalInfo.practitionerType",
        populate: {
          path: "userId",
          select: "personalInfo.firstName personalInfo.lastName",
        },
      });

    if (!authGrant) {
      return NextResponse.json({ error: "Authorization grant not found" }, { status: 404 });
    }

    // Check grant status and expiration
    if (!authGrant.isActive()) {
      return NextResponse.json(
        {
          error: "Grant is not active",
          status: authGrant.grantDetails.status,
          isExpired: authGrant.isExpired(),
        },
        { status: 400 }
      );
    }

    // Log the access
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authGrant.userId.toString(), {
      action: "QR_CODE_SCAN_ATTEMPTED",
      grantId: authGrant._id.toString(),
      scannedBy,
      note: "Endpoint under review for knowledge base compliance",
    });

    // Generate JWT access token for this specific grant
    const accessTokenData = QRCodeService.generateAccessToken(authGrant.userId.toString(), authGrant._id.toString());

    return NextResponse.json({
      success: true,
      message: "Access token generated (endpoint under review for compliance)",
      data: {
        grantId: authGrant._id.toString(),
        accessToken: accessTokenData,
        validUntil: authGrant.grantDetails.expiresAt,
        accessScope: authGrant.accessScope,
      },
    });
  } catch (error) {
    console.error("Error processing scanned QR code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
