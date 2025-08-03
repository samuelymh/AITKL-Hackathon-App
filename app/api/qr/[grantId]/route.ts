import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import AuthorizationGrant, { GrantStatus } from "@/lib/models/AuthorizationGrant";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";

/**
 * GET /api/qr/[grantId]
 * Generate and return QR code for authorization grant
 */
export async function GET(request: NextRequest, { params }: { params: { grantId: string } }) {
  try {
    await connectToDatabase();

    const { grantId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "png"; // png, svg
    const width = parseInt(searchParams.get("width") || "300");
    const height = parseInt(searchParams.get("height") || "300");

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

    // Prepare QR code data
    const accessScopeArray = Object.entries(authGrant.accessScope)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);

    const qrData = {
      grantId: authGrant._id.toString(),
      userId: authGrant.userId.toString(),
      organizationId: authGrant.organizationId.toString(),
      expiresAt: authGrant.grantDetails.expiresAt,
      accessScope: accessScopeArray,
    };

    // Generate QR code based on format
    let qrCodeResult: string;
    let contentType: string;

    const options = {
      width,
      height,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    };

    if (format === "svg") {
      qrCodeResult = await QRCodeService.generateAuthorizationQRSVG(qrData, options);
      contentType = "image/svg+xml";
    } else {
      qrCodeResult = await QRCodeService.generateAuthorizationQR(qrData, options);
      contentType = "image/png";

      // Convert data URL to buffer for PNG
      const base64Data = qrCodeResult.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Log QR code generation
      await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authGrant.userId.toString(), {
        action: "QR_CODE_GENERATED",
        grantId: authGrant._id.toString(),
        format,
        width,
        height,
      });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Log QR code generation
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, authGrant.userId.toString(), {
      action: "QR_CODE_GENERATED",
      grantId: authGrant._id.toString(),
      format,
      width,
      height,
    });

    return new NextResponse(qrCodeResult, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/qr/[grantId]
 * Validate and process scanned QR code
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

    // Validate QR code data
    const validatedQRData = QRCodeService.validateQRCodeData(scannedData);
    if (!validatedQRData) {
      return NextResponse.json({ error: "Invalid QR code data" }, { status: 400 });
    }

    // Verify grantId matches
    if (validatedQRData.grantId !== grantId) {
      return NextResponse.json({ error: "QR code grant ID does not match requested grant" }, { status: 400 });
    }

    // Find and validate the grant
    const authGrant = await AuthorizationGrant.findById(grantId).populate([
      "userId",
      "organizationId",
      "requestingPractitionerId",
    ]);

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
      action: "QR_CODE_SCANNED",
      grantId: authGrant._id.toString(),
      scannedBy,
      accessScope: Object.entries(authGrant.accessScope)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => key),
      organizationId: authGrant.organizationId.toString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        grant: authGrant,
        accessToken: QRCodeService.generateAccessToken(),
        validUntil: authGrant.grantDetails.expiresAt,
        accessScope: authGrant.accessScope,
      },
    });
  } catch (error) {
    console.error("Error processing scanned QR code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
