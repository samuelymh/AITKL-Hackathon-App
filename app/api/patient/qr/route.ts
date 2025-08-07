import { NextRequest, NextResponse } from "next/server";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { getAuthContext } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { logger } from "@/lib/logger";

/**
 * GET /api/patient/qr
 * Generate patient's QR code containing their digital identifier
 *
 * This endpoint generates the QR code that patients show at healthcare facilities
 * The QR code contains only the patient's digitalIdentifier, following the knowledge base specification
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get authenticated user context
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "png"; // png, svg
    const width = parseInt(searchParams.get("width") || "300");
    const height = parseInt(searchParams.get("height") || "300");

    // Find the authenticated user
    const user = await User.findById(authContext.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure user has a digitalIdentifier
    if (!user.digitalIdentifier) {
      // This shouldn't happen as digitalIdentifier is auto-generated
      return NextResponse.json(
        { error: "Digital identifier not found" },
        { status: 500 },
      );
    }

    const options = {
      width,
      height,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    };

    let qrCodeResult: string;
    let contentType: string;

    if (format === "svg") {
      qrCodeResult = await QRCodeService.generatePatientQRSVG(
        user.digitalIdentifier,
        options,
      );
      contentType = "image/svg+xml";
    } else {
      qrCodeResult = await QRCodeService.generatePatientQR(
        user.digitalIdentifier,
        options,
      );
      contentType = "image/png";

      // Convert data URL to buffer for PNG
      const base64Data = qrCodeResult.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Log QR code generation
      await auditLogger.logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        request,
        user._id.toString(),
        {
          action: "PATIENT_QR_GENERATED",
          digitalIdentifier: user.digitalIdentifier,
          format,
          width,
          height,
        },
      );

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // Log QR code generation for SVG
    await auditLogger.logSecurityEvent(
      SecurityEventType.DATA_ACCESS,
      request,
      user._id.toString(),
      {
        action: "PATIENT_QR_GENERATED",
        digitalIdentifier: user.digitalIdentifier,
        format,
        width,
        height,
      },
    );

    return new NextResponse(qrCodeResult, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    logger.error("Error generating patient QR code:", {
      error: error instanceof Error ? error.message : error,
    });

    // Try to log the error if we have auth context
    try {
      const authContext = await getAuthContext(request);
      await auditLogger.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        request,
        authContext?.userId || "unknown",
        {
          action: "PATIENT_QR_GENERATION_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    } catch (logError) {
      logger.error("Failed to log QR generation error:", {
        logError: logError instanceof Error ? logError.message : logError,
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/patient/qr/regenerate
 * Regenerate patient's digital identifier and QR code
 *
 * This allows patients to refresh their QR code for security purposes
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get authenticated user context
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Find the authenticated user
    const user = await User.findById(authContext.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store old identifier for audit
    const oldIdentifier = user.digitalIdentifier;

    // Force regeneration of digital identifier
    user.digitalIdentifier = ""; // This will trigger auto-generation in pre-save middleware
    await user.save();

    // Log the regeneration
    await auditLogger.logSecurityEvent(
      SecurityEventType.DATA_MODIFICATION,
      request,
      user._id.toString(),
      {
        action: "DIGITAL_IDENTIFIER_REGENERATED",
        oldIdentifier: oldIdentifier,
        newIdentifier: user.digitalIdentifier,
        reason: "User requested regeneration",
      },
    );

    return NextResponse.json({
      success: true,
      message: "Digital identifier regenerated successfully",
      data: {
        digitalIdentifier: user.digitalIdentifier,
        qrDisplayUrl: QRCodeService.createPatientQRURL(user.digitalIdentifier),
      },
    });
  } catch (error) {
    logger.error("Error regenerating digital identifier:", {
      error: error instanceof Error ? error.message : error,
    });

    // Try to log the error if we have auth context
    try {
      const authContext = await getAuthContext(request);
      await auditLogger.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        request,
        authContext?.userId || "unknown",
        {
          action: "DIGITAL_IDENTIFIER_REGENERATION_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
    } catch (logError) {
      logger.error("Failed to log regeneration error:", {
        logError: logError instanceof Error ? logError.message : logError,
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
