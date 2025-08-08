import jwt from "jsonwebtoken";
import crypto from "crypto";
import { QRCodeGenerationError } from "@/lib/errors/custom-errors";

export interface SecurePrescriptionQRData {
  type: "prescription";
  version: "1.0";
  timestamp: string;
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

export interface PrescriptionSignature {
  signature: string;
  algorithm: string;
  keyId: string;
  timestamp: string;
}

export class SecureQRCodeService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
  private static readonly QR_SIGNING_KEY = process.env.QR_SIGNING_KEY || "qr-signing-key";
  private static readonly QR_KEY_ID = process.env.QR_KEY_ID || "qr-key-1";

  /**
   * Generate a digitally signed prescription QR code
   */
  static async generateSecurePrescriptionQR(prescriptionData: SecurePrescriptionQRData): Promise<string> {
    try {
      // Create the prescription payload
      const payload = {
        ...prescriptionData,
        timestamp: new Date().toISOString(),
      };

      // Generate digital signature
      const signature = this.createDigitalSignature(payload);

      // Create the complete QR data with signature
      const secureQRData = {
        ...payload,
        security: {
          signature: signature.signature,
          algorithm: signature.algorithm,
          keyId: signature.keyId,
          timestamp: signature.timestamp,
        },
      };

      // Create JWT token for additional security layer
      const token = jwt.sign(secureQRData, this.JWT_SECRET, {
        expiresIn: "30d", // Prescription valid for 30 days
        algorithm: "HS256",
        issuer: "healthrecords-system",
        audience: "pharmacy-verification",
      });

      // Encode the JWT token for QR code
      const encodedData = Buffer.from(token).toString("base64");

      return encodedData;
    } catch (error) {
      console.error("Error generating secure prescription QR:", error);
      throw new QRCodeGenerationError("Failed to generate secure prescription QR code");
    }
  }

  /**
   * Verify and decode a secure prescription QR code
   */
  static async verifySecurePrescriptionQR(encodedData: string): Promise<SecurePrescriptionQRData | null> {
    try {
      // Decode the base64 data
      const token = Buffer.from(encodedData, "base64").toString("utf-8");

      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "healthrecords-system",
        audience: "pharmacy-verification",
      }) as any;

      // Verify digital signature
      const isSignatureValid = this.verifyDigitalSignature(decoded, decoded.security);

      if (!isSignatureValid) {
        console.error("Digital signature verification failed");
        return null;
      }

      // Check if prescription has expired
      const expiresAt = new Date(decoded.expiresAt);
      if (expiresAt < new Date()) {
        console.error("Prescription has expired");
        return null;
      }

      // Remove security metadata before returning
      const { security, ...prescriptionData } = decoded;

      return prescriptionData as SecurePrescriptionQRData;
    } catch (error) {
      console.error("Error verifying secure prescription QR:", error);
      return null;
    }
  }

  /**
   * Create a digital signature for the prescription data
   */
  private static createDigitalSignature(data: any): PrescriptionSignature {
    try {
      // Create a canonical string representation of the data
      const canonicalData = this.canonicalize(data);

      // Create HMAC signature
      const hmac = crypto.createHmac("sha256", this.QR_SIGNING_KEY);
      hmac.update(canonicalData);
      const signature = hmac.digest("hex");

      return {
        signature,
        algorithm: "HMAC-SHA256",
        keyId: this.QR_KEY_ID,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error creating digital signature:", error);
      throw new QRCodeGenerationError("Failed to create digital signature");
    }
  }

  /**
   * Verify a digital signature
   */
  private static verifyDigitalSignature(data: any, signatureData: PrescriptionSignature): boolean {
    try {
      // Remove security metadata for signature verification
      const { security, ...dataToVerify } = data;

      // Create canonical string representation
      const canonicalData = this.canonicalize(dataToVerify);

      // Create expected signature
      const hmac = crypto.createHmac("sha256", this.QR_SIGNING_KEY);
      hmac.update(canonicalData);
      const expectedSignature = hmac.digest("hex");

      // Compare signatures using constant-time comparison
      return crypto.timingSafeEqual(Buffer.from(signatureData.signature, "hex"), Buffer.from(expectedSignature, "hex"));
    } catch (error) {
      console.error("Error verifying digital signature:", error);
      return false;
    }
  }

  /**
   * Create a canonical string representation of data for signing
   */
  private static canonicalize(data: any): string {
    // Sort keys recursively and create deterministic string
    const sortedData = this.sortObjectKeys(data);
    return JSON.stringify(sortedData);
  }

  /**
   * Recursively sort object keys for deterministic serialization
   */
  private static sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: any = {};

    for (const key of sortedKeys) {
      sortedObj[key] = this.sortObjectKeys(obj[key]);
    }

    return sortedObj;
  }

  /**
   * Generate a secure hash for quick integrity checks
   */
  static generateIntegrityHash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Verify integrity hash
   */
  static verifyIntegrityHash(data: string, expectedHash: string): boolean {
    const actualHash = this.generateIntegrityHash(data);
    return crypto.timingSafeEqual(Buffer.from(expectedHash, "hex"), Buffer.from(actualHash, "hex"));
  }
}

export default SecureQRCodeService;
