import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import AuthorizationGrant from "@/lib/models/AuthorizationGrant";
import { auditLogger, SecurityEventType } from "@/lib/services/audit-logger";
import { QRCodeService } from "@/lib/services/qr-code-service";
import { PushNotificationService } from "@/lib/services/push-notification-service";
import { getClientIP } from "@/lib/utils/network";

/**
 * POST /api/v1/authorizations/request
 * Create authorization request after scanning patient's QR code
 *
 * This follows the correct flow from the knowledge base:
 * 1. Healthcare provider scans patient's QR code containing digitalIdentifier
 * 2. System extracts digitalIdentifier from QR code
 * 3. API call to this endpoint with digitalIdentifier and organization info
 * 4. Backend creates AuthorizationGrant with status: PENDING
 * 5. Push notification sent to patient's mobile app
 * 6. Patient reviews and approves/denies the access request
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      scannedQRData,
      organizationId,
      requestingPractitionerId,
      accessScope,
      timeWindowHours = 24,
      requestMetadata,
    } = body;

    // Validate required fields
    if (!scannedQRData || !organizationId) {
      return NextResponse.json({ error: "Missing required fields: scannedQRData and organizationId" }, { status: 400 });
    }

    // Extract and validate QR code data
    const qrCodeData = QRCodeService.validatePatientQRCode(scannedQRData);
    if (!qrCodeData) {
      await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, "unknown", {
        action: "INVALID_QR_CODE_SCAN",
        organizationId,
        error: "Invalid QR code format or expired",
      });

      return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 400 });
    }

    // Find the patient by digital identifier
    const patient = await User.findByDigitalId(qrCodeData.digitalIdentifier);
    if (!patient) {
      await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, "unknown", {
        action: "PATIENT_NOT_FOUND",
        digitalIdentifier: qrCodeData.digitalIdentifier,
        organizationId,
      });

      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Validate organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check for existing active grant
    const existingGrant = await AuthorizationGrant.findOne({
      userId: patient._id,
      organizationId: organizationId,
      "grantDetails.status": "ACTIVE",
      "grantDetails.expiresAt": { $gt: new Date() },
      auditDeletedDateTime: { $exists: false },
    });

    if (existingGrant) {
      return NextResponse.json(
        {
          success: true,
          message: "Active authorization already exists",
          data: {
            grantId: existingGrant._id,
            status: existingGrant.grantDetails.status,
            expiresAt: existingGrant.grantDetails.expiresAt,
            accessScope: existingGrant.accessScope,
          },
        },
        { status: 200 }
      );
    }

    // Prepare request metadata
    // Capture request metadata with secure IP handling
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "unknown";

    const requestMeta = {
      ipAddress: clientIP,
      userAgent: userAgent,
      deviceInfo: requestMetadata?.deviceInfo,
      location: requestMetadata?.location,
    };

    // Prepare access scope with defaults
    const scope = {
      canViewMedicalHistory: accessScope?.canViewMedicalHistory ?? true,
      canViewPrescriptions: accessScope?.canViewPrescriptions ?? true,
      canCreateEncounters: accessScope?.canCreateEncounters ?? false,
      canViewAuditLogs: accessScope?.canViewAuditLogs ?? false,
    };

    // Create authorization grant request
    const authGrant = await AuthorizationGrant.createRequest(
      patient._id.toString(),
      organizationId,
      requestMeta,
      scope,
      timeWindowHours,
      requestingPractitionerId
    );

    // Log the authorization request
    await auditLogger.logSecurityEvent(SecurityEventType.DATA_ACCESS, request, patient._id.toString(), {
      action: "AUTHORIZATION_REQUEST_CREATED",
      grantId: authGrant._id.toString(),
      organizationId: organizationId,
      requestingPractitionerId: requestingPractitionerId,
      digitalIdentifier: qrCodeData.digitalIdentifier,
      accessScope: scope,
      timeWindowHours: timeWindowHours,
    });

    // Send push notification to patient
    try {
      await PushNotificationService.sendAuthorizationRequest(patient._id.toString(), authGrant._id.toString());
    } catch (notificationError) {
      console.warn("Failed to send push notification:", notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Authorization request created successfully",
        data: {
          grantId: authGrant._id,
          status: authGrant.grantDetails.status,
          expiresAt: authGrant.grantDetails.expiresAt,
          patient: {
            name: await patient.getFullName(),
            digitalIdentifier: patient.digitalIdentifier,
          },
          organization: {
            name: organization.organizationInfo.name,
            type: organization.organizationInfo.type,
          },
          accessScope: authGrant.accessScope,
          timeWindowHours: authGrant.grantDetails.timeWindowHours,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating authorization request:", error);

    // Log the error
    await auditLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, request, "system", {
      action: "AUTHORIZATION_REQUEST_ERROR",
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: `Failed to create authorization request: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
