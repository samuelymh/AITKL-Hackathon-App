import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SecureQRCodeService } from "@/lib/services/secure-qr-service";
import { auditLogger } from "@/lib/services/audit-logger";
import { withAuth } from "@/lib/middleware/auth";
import { UserRole } from "@/lib/auth";

const verifyPrescriptionSchema = z.object({
  qrData: z.string().min(1, "QR data is required"),
  pharmacyId: z.string().min(1, "Pharmacy ID is required"),
  pharmacistId: z.string().min(1, "Pharmacist ID is required"),
});

async function handleVerifyPrescription(request: NextRequest, authContext: any) {
  try {
    const body = await request.json();
    const validatedData = verifyPrescriptionSchema.parse(body);

    // Get client IP from headers
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Log verification attempt
    await auditLogger.log({
      userId: authContext.user.id,
      userRole: authContext.user.role,
      digitalIdentifier: authContext.user.digitalId,
      action: "prescription_qr_verification_attempt",
      resource: "prescription",
      method: "POST",
      endpoint: "/api/pharmacy/verify-prescription",
      ip: clientIP,
      userAgent: request.headers.get("user-agent") || "unknown",
      statusCode: 200,
      success: true,
      details: {
        pharmacyId: validatedData.pharmacyId,
        pharmacistId: validatedData.pharmacistId,
        timestamp: new Date().toISOString(),
      },
    });

    // Verify the secure prescription QR code
    const prescriptionData = await SecureQRCodeService.verifySecurePrescriptionQR(validatedData.qrData);

    if (!prescriptionData) {
      // Log failed verification
      await auditLogger.log({
        userId: authContext.user.id,
        userRole: authContext.user.role,
        digitalIdentifier: authContext.user.digitalId,
        action: "prescription_qr_verification_failed",
        resource: "prescription",
        method: "POST",
        endpoint: "/api/pharmacy/verify-prescription",
        ip: clientIP,
        userAgent: request.headers.get("user-agent") || "unknown",
        statusCode: 400,
        success: false,
        details: {
          reason: "Invalid or expired QR code",
          pharmacyId: validatedData.pharmacyId,
          pharmacistId: validatedData.pharmacistId,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          error: "Invalid or expired prescription QR code",
          verified: false,
        },
        { status: 400 }
      );
    }

    // Check if prescription has already been dispensed
    // TODO: Add database check for dispensation status

    // Log successful verification
    await auditLogger.log({
      userId: authContext.user.id,
      userRole: authContext.user.role,
      digitalIdentifier: authContext.user.digitalId,
      action: "prescription_qr_verification_success",
      resource: "prescription",
      method: "POST",
      endpoint: "/api/pharmacy/verify-prescription",
      ip: clientIP,
      userAgent: request.headers.get("user-agent") || "unknown",
      statusCode: 200,
      success: true,
      details: {
        prescriptionData: {
          encounterId: prescriptionData.encounterId,
          prescriptionIndex: prescriptionData.prescriptionIndex,
          medication: prescriptionData.medication.name,
          patientDigitalId: prescriptionData.patient.digitalId,
          prescriberOrganization: prescriptionData.organization.name,
        },
        pharmacyId: validatedData.pharmacyId,
        pharmacistId: validatedData.pharmacistId,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      verified: true,
      prescription: {
        encounterId: prescriptionData.encounterId,
        prescriptionIndex: prescriptionData.prescriptionIndex,
        medication: prescriptionData.medication,
        patient: {
          digitalId: prescriptionData.patient.digitalId,
        },
        prescriber: {
          id: prescriptionData.prescriber.id,
          licenseNumber: prescriptionData.prescriber.licenseNumber,
        },
        organization: prescriptionData.organization,
        issuedAt: prescriptionData.issuedAt,
        expiresAt: prescriptionData.expiresAt,
        verificationTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error verifying prescription QR code:", error);

    // Log error
    try {
      const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

      await auditLogger.log({
        userId: "system",
        userRole: "system",
        action: "prescription_qr_verification_error",
        resource: "prescription",
        method: "POST",
        endpoint: "/api/pharmacy/verify-prescription",
        ip: clientIP,
        userAgent: request.headers.get("user-agent") || "unknown",
        statusCode: 500,
        success: false,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (logError) {
      console.error("Failed to log audit event:", logError);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Wrap with authentication middleware - require pharmacist role
export const POST = withAuth(handleVerifyPrescription, {
  allowedRoles: [UserRole.PHARMACIST],
  requireAuth: true,
});

// Information endpoint
export async function GET() {
  return NextResponse.json(
    {
      message: "Prescription QR verification endpoint",
      method: "POST",
      requiredFields: ["qrData", "pharmacyId", "pharmacistId"],
      security: "Requires pharmacist authentication",
    },
    { status: 200 }
  );
}
