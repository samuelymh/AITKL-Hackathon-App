import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import { QRCodeGenerationError, TokenGenerationError } from "@/lib/errors/custom-errors";
import { SecureQRCodeService, SecurePrescriptionQRData } from "./secure-qr-service";

export interface QRCodeData {
  digitalIdentifier: string; // The patient's unique HID
  version: string;
  timestamp: string;
}

export interface PrescriptionData {
  encounterId: string;
  prescriptionIndex: number;
  medication: {
    name: string;
    dosage: string;
    frequency: string;
  };
  patient: {
    digitalId: string;
  };
  prescriber: {
    id: string;
    licenseNumber?: string;
  };
  organization: {
    id: string;
    name: string;
  };
  issuedAt: string;
  expiresAt: string;
}

export interface QRCodeGenerationOptions {
  width?: number;
  height?: number;
  format?: "png" | "svg" | "pdf";
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export class QRCodeService {
  /**
   * Generate patient identification QR code (contains only digitalIdentifier)
   * This is the QR code patients show at healthcare facilities
   */
  static async generatePatientQR(digitalIdentifier: string, options: QRCodeGenerationOptions = {}): Promise<string> {
    try {
      // Create the payload for the QR code according to knowledge base specification
      const qrPayload = {
        type: "health_access_request",
        digitalIdentifier: digitalIdentifier,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      // Convert to JSON and encode
      const jsonPayload = JSON.stringify(qrPayload);

      // Default QR code options
      const qrOptions = {
        width: options.width || 300,
        height: options.height || 300,
        margin: options.margin || 2,
        color: {
          dark: options.color?.dark || "#000000",
          light: options.color?.light || "#FFFFFF",
        },
        errorCorrectionLevel: "M" as const,
      };

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(jsonPayload, qrOptions);

      return qrCodeDataURL;
    } catch (error) {
      console.error("Error generating patient QR code:", error);
      throw new QRCodeGenerationError("Failed to generate patient QR code");
    }
  }

  /**
   * Generate patient identification QR code as SVG
   */
  static async generatePatientQRSVG(digitalIdentifier: string, options: QRCodeGenerationOptions = {}): Promise<string> {
    try {
      const qrPayload = {
        type: "health_access_request",
        digitalIdentifier: digitalIdentifier,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      const jsonPayload = JSON.stringify(qrPayload);

      const qrOptions = {
        width: options.width || 300,
        height: options.height || 300,
        margin: options.margin || 2,
        color: {
          dark: options.color?.dark || "#000000",
          light: options.color?.light || "#FFFFFF",
        },
        errorCorrectionLevel: "M" as const,
      };

      const qrCodeSVG = await QRCode.toString(jsonPayload, {
        type: "svg",
        ...qrOptions,
      });

      return qrCodeSVG;
    } catch (error) {
      console.error("Error generating patient QR code SVG:", error);
      throw new QRCodeGenerationError("Failed to generate patient QR code SVG");
    }
  }

  /**
   * Validate and extract digital identifier from scanned QR code
   */
  static validatePatientQRCode(data: string): { digitalIdentifier: string; timestamp: string } | null {
    try {
      const parsed = JSON.parse(data);

      if (parsed.type !== "health_access_request" || !parsed.digitalIdentifier) {
        return null;
      }

      // Validate required fields
      if (!parsed.digitalIdentifier || !parsed.version || !parsed.timestamp) {
        return null;
      }

      // Validate timestamp (QR codes older than 24 hours might be considered stale)
      const qrTimestamp = new Date(parsed.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - qrTimestamp.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        console.warn("QR code is older than 24 hours");
        // Note: We still return the data but caller can decide if they want to accept it
      }

      return {
        digitalIdentifier: parsed.digitalIdentifier,
        timestamp: parsed.timestamp,
      };
    } catch (error) {
      console.error("Error validating patient QR code data:", error);
      return null;
    }
  }

  /**
   * Generate a JWT-based access token for QR code authorization grants
   * @param digitalIdentifier - Patient's digital identifier (HID)
   * @param grantId - Unique identifier for the authorization grant
   * @param expiresInSeconds - Token lifespan in seconds (default: 1 hour)
   * @returns Object containing JWT token and expiration timestamp
   */
  static generateAccessToken(
    digitalIdentifier: string,
    grantId: string,
    expiresInSeconds: number = 3600
  ): { token: string; expiresAt: Date } {
    try {
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      const payload = {
        type: "qr_access_grant",
        digitalIdentifier: digitalIdentifier,
        grantId: grantId,
        purpose: "healthcare_authorization",
        iss: process.env.JWT_ISSUER || "health-app",
        aud: process.env.JWT_AUDIENCE || "health-app-providers",
      };

      const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key";

      const token = jwt.sign(payload, secret, {
        expiresIn: expiresInSeconds,
        algorithm: "HS256",
      });

      return { token, expiresAt };
    } catch (error) {
      console.error("Error generating JWT access token:", error);
      throw new TokenGenerationError("Failed to generate secure access token");
    }
  }

  /**
   * Generate a short-lived JWT access token for API access (15 minutes default)
   */
  static generateShortLivedToken(
    digitalIdentifier: string,
    grantId: string,
    expiresInSeconds: number = 900
  ): { token: string; expiresAt: Date } {
    return this.generateAccessToken(digitalIdentifier, grantId, expiresInSeconds);
  }

  /**
   * Verify and decode QR code access token
   * @param token - JWT token to verify
   * @returns Decoded payload or null if invalid
   */
  static verifyAccessToken(token: string): {
    digitalIdentifier: string;
    grantId: string;
    purpose: string;
    iat: number;
    exp: number;
  } | null {
    try {
      const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key";

      const payload = jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER || "health-app",
        audience: process.env.JWT_AUDIENCE || "health-app-providers",
      }) as any;

      // Validate QR access token structure
      if (payload.type !== "qr_access_grant" || !payload.digitalIdentifier || !payload.grantId) {
        console.error("Invalid QR access token structure");
        return null;
      }

      return {
        digitalIdentifier: payload.digitalIdentifier,
        grantId: payload.grantId,
        purpose: payload.purpose,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      console.error("QR access token verification failed:", error);
      return null;
    }
  }

  /**
   * Create patient QR code display URL for frontend
   */
  static createPatientQRURL(digitalIdentifier: string, baseURL: string = ""): string {
    return `${baseURL}/patient/qr/${digitalIdentifier}`;
  }

  /**
   * Generate prescription QR code with digital signature
   */
  static async generatePrescriptionQR(
    prescriptionData: PrescriptionData,
    options: QRCodeGenerationOptions = {}
  ): Promise<string> {
    try {
      // Convert to secure prescription data format
      const secureData: SecurePrescriptionQRData = {
        type: "prescription",
        version: "1.0",
        timestamp: new Date().toISOString(),
        ...prescriptionData,
      };

      // Generate secure QR data with digital signature
      const secureQRData = await SecureQRCodeService.generateSecurePrescriptionQR(secureData);

      // QR code options
      const qrOptions = {
        width: options.width || 300,
        height: options.height || 300,
        margin: options.margin || 2,
        color: {
          dark: options.color?.dark || "#000000",
          light: options.color?.light || "#FFFFFF",
        },
        errorCorrectionLevel: "M" as const,
      };

      // Generate QR code with the secure data
      const qrCodeDataURL = await QRCode.toDataURL(secureQRData, qrOptions);

      return qrCodeDataURL;
    } catch (error) {
      console.error("Error generating prescription QR code:", error);
      throw new QRCodeGenerationError("Failed to generate prescription QR code");
    }
  }

  /**
   * Verify and extract prescription data from QR code
   */
  static async verifyPrescriptionQR(qrData: string): Promise<SecurePrescriptionQRData | null> {
    try {
      return await SecureQRCodeService.verifySecurePrescriptionQR(qrData);
    } catch (error) {
      console.error("Error verifying prescription QR code:", error);
      return null;
    }
  }

  /**
   * Create authorization request URL that healthcare providers will call after scanning
   */
  static createAuthRequestURL(baseURL: string = ""): string {
    return `${baseURL}/api/v1/authorizations/request`;
  }
}

export default QRCodeService;
