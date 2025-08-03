import QRCode from "qrcode";
import crypto from "crypto";
import { QRCodeGenerationError, TokenGenerationError } from "@/lib/errors/custom-errors";

export interface QRCodeData {
  grantId: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
  accessScope: string[];
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
   * Generate QR code for authorization grant
   */
  static async generateAuthorizationQR(qrData: QRCodeData, options: QRCodeGenerationOptions = {}): Promise<string> {
    try {
      // Create the payload for the QR code
      const qrPayload = {
        type: "health_auth",
        version: "1.0",
        data: qrData,
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
      console.error("Error generating QR code:", error);
      throw new QRCodeGenerationError("Failed to generate QR code");
    }
  }

  /**
   * Generate QR code as SVG
   */
  static async generateAuthorizationQRSVG(qrData: QRCodeData, options: QRCodeGenerationOptions = {}): Promise<string> {
    try {
      const qrPayload = {
        type: "health_auth",
        version: "1.0",
        data: qrData,
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
      console.error("Error generating QR code SVG:", error);
      throw new QRCodeGenerationError("Failed to generate QR code SVG");
    }
  }

  /**
   * Validate QR code data structure
   */
  static validateQRCodeData(data: string): QRCodeData | null {
    try {
      const parsed = JSON.parse(data);

      if (parsed.type !== "health_auth" || !parsed.data) {
        return null;
      }

      const qrData = parsed.data;

      // Validate required fields
      if (!qrData.grantId || !qrData.userId || !qrData.organizationId || !qrData.expiresAt) {
        return null;
      }

      // Validate expiration
      const expirationDate = new Date(qrData.expiresAt);
      if (expirationDate <= new Date()) {
        return null; // Expired
      }

      return {
        grantId: qrData.grantId,
        userId: qrData.userId,
        organizationId: qrData.organizationId,
        expiresAt: expirationDate,
        accessScope: qrData.accessScope || [],
      };
    } catch (error) {
      console.error("Error validating QR code data:", error);
      return null;
    }
  }

  /**
   * Generate a cryptographically secure access token with expiration
   * @param expiresInSeconds - Token lifespan in seconds (default: 1 hour)
   * @returns Object containing token and expiration timestamp
   */
  static generateAccessToken(expiresInSeconds: number = 3600): { token: string; expiresAt: Date } {
    try {
      const token = crypto.randomBytes(32).toString("hex"); // 32 bytes = 256 bits
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      return { token, expiresAt };
    } catch (error) {
      console.error("Error generating access token:", error);
      throw new TokenGenerationError("Failed to generate secure access token");
    }
  }

  /**
   * Generate a short-lived access token for QR codes (15 minutes default)
   */
  static generateQRAccessToken(expiresInSeconds: number = 900): { token: string; expiresAt: Date } {
    return this.generateAccessToken(expiresInSeconds);
  }

  /**
   * Create QR code display URL for frontend
   */
  static createQRDisplayURL(grantId: string, baseURL: string = ""): string {
    return `${baseURL}/qr/${grantId}`;
  }

  /**
   * Create scan URL that practitioners will use
   */
  static createScanURL(grantId: string, baseURL: string = ""): string {
    return `${baseURL}/scan/${grantId}`;
  }
}

export default QRCodeService;
