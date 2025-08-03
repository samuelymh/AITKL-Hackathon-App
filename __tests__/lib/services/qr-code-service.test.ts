import { describe, it, expect, jest } from "@jest/globals";
import { QRCodeService, QRCodeData } from "../../../lib/services/qr-code-service";
import { QRCodeGenerationError, TokenGenerationError } from "../../../lib/errors/custom-errors";

// Mock QRCode module with proper typing
const mockToDataURL = jest.fn() as jest.MockedFunction<any>;
const mockToString = jest.fn() as jest.MockedFunction<any>;

jest.mock("qrcode", () => ({
  toDataURL: mockToDataURL,
  toString: mockToString,
}));

describe("QRCodeService", () => {
  const mockQRData: QRCodeData = {
    grantId: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439012",
    organizationId: "507f1f77bcf86cd799439013",
    expiresAt: new Date("2025-12-31"),
    accessScope: ["canViewMedicalHistory", "canViewPrescriptions"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAuthorizationQR", () => {
    it("should generate QR code successfully", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      const result = await QRCodeService.generateAuthorizationQR(mockQRData);

      expect(result).toBe(mockDataURL);
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.stringContaining('"type":"health_auth"'),
        expect.objectContaining({
          width: 300,
          height: 300,
          margin: 2,
        })
      );
    });

    it("should use custom options when provided", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      const options = {
        width: 500,
        height: 500,
        margin: 4,
        color: { dark: "#FF0000", light: "#00FF00" },
      };

      await QRCodeService.generateAuthorizationQR(mockQRData, options);

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          width: 500,
          height: 500,
          margin: 4,
          color: { dark: "#FF0000", light: "#00FF00" },
        })
      );
    });

    it("should throw QRCodeGenerationError on failure", async () => {
      mockToDataURL.mockRejectedValue(new Error("QR code generation failed"));

      await expect(QRCodeService.generateAuthorizationQR(mockQRData)).rejects.toThrow(QRCodeGenerationError);
    });

    it("should include correct payload structure", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      await QRCodeService.generateAuthorizationQR(mockQRData);

      const callArgs = mockToDataURL.mock.calls[0];
      const payload = JSON.parse(callArgs[0] as string);

      expect(payload).toMatchObject({
        type: "health_auth",
        version: "1.0",
        data: mockQRData,
        timestamp: expect.any(String),
      });
    });
  });

  describe("generateAuthorizationQRSVG", () => {
    it("should generate SVG QR code successfully", async () => {
      const mockSVG = "<svg>mock SVG content</svg>";
      mockToString.mockResolvedValue(mockSVG);

      const result = await QRCodeService.generateAuthorizationQRSVG(mockQRData);

      expect(result).toBe(mockSVG);
      expect(mockToString).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "svg",
          width: 300,
          height: 300,
        })
      );
    });

    it("should throw QRCodeGenerationError on SVG generation failure", async () => {
      mockToString.mockRejectedValue(new Error("SVG generation failed"));

      await expect(QRCodeService.generateAuthorizationQRSVG(mockQRData)).rejects.toThrow(QRCodeGenerationError);
    });
  });

  describe("validateQRCodeData", () => {
    it("should validate correct QR code data", () => {
      const validQRPayload = {
        type: "health_auth",
        version: "1.0",
        data: {
          ...mockQRData,
          expiresAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        },
      };

      const result = QRCodeService.validateQRCodeData(JSON.stringify(validQRPayload));

      expect(result).toMatchObject({
        grantId: mockQRData.grantId,
        userId: mockQRData.userId,
        organizationId: mockQRData.organizationId,
        accessScope: mockQRData.accessScope,
      });
    });

    it("should return null for invalid type", () => {
      const invalidQRPayload = {
        type: "invalid_type",
        data: mockQRData,
      };

      const result = QRCodeService.validateQRCodeData(JSON.stringify(invalidQRPayload));
      expect(result).toBeNull();
    });

    it("should return null for missing required fields", () => {
      const incompleteQRPayload = {
        type: "health_auth",
        data: {
          grantId: mockQRData.grantId,
          // Missing userId, organizationId, expiresAt
        },
      };

      const result = QRCodeService.validateQRCodeData(JSON.stringify(incompleteQRPayload));
      expect(result).toBeNull();
    });

    it("should return null for expired QR code", () => {
      const expiredQRPayload = {
        type: "health_auth",
        data: {
          ...mockQRData,
          expiresAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        },
      };

      const result = QRCodeService.validateQRCodeData(JSON.stringify(expiredQRPayload));
      expect(result).toBeNull();
    });

    it("should return null for malformed JSON", () => {
      const result = QRCodeService.validateQRCodeData("invalid json");
      expect(result).toBeNull();
    });
  });

  describe("generateAccessToken", () => {
    it("should generate a token with expiration", () => {
      const result = QRCodeService.generateAccessToken(3600);

      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(result.token.length).toBe(64);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should use default expiration when not specified", () => {
      const result = QRCodeService.generateAccessToken();
      const expectedExpiry = Date.now() + 3600 * 1000; // Default 1 hour

      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2); // Within 100ms
    });

    it("should generate unique tokens with different expirations", () => {
      const result1 = QRCodeService.generateAccessToken(1800); // 30 minutes
      const result2 = QRCodeService.generateAccessToken(7200); // 2 hours

      expect(result1.token).not.toBe(result2.token);
      expect(result1.expiresAt.getTime()).toBeLessThan(result2.expiresAt.getTime());
    });

    it("should throw TokenGenerationError if crypto fails", () => {
      // Mock crypto.randomBytes to throw an error
      const originalRandomBytes = require("crypto").randomBytes;
      require("crypto").randomBytes = jest.fn().mockImplementation(() => {
        throw new Error("Crypto error");
      });

      expect(() => QRCodeService.generateAccessToken()).toThrow(TokenGenerationError);

      // Restore original function
      require("crypto").randomBytes = originalRandomBytes;
    });
  });

  describe("generateQRAccessToken", () => {
    it("should generate a short-lived token for QR codes", () => {
      const result = QRCodeService.generateQRAccessToken();
      const expectedExpiry = Date.now() + 900 * 1000; // Default 15 minutes

      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2);
    });

    it("should accept custom expiration for QR tokens", () => {
      const result = QRCodeService.generateQRAccessToken(600); // 10 minutes
      const expectedExpiry = Date.now() + 600 * 1000;

      expect(result.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2);
    });
  });

  describe("createQRDisplayURL", () => {
    it("should create correct display URL", () => {
      const grantId = "507f1f77bcf86cd799439011";
      const baseURL = "https://example.com";

      const url = QRCodeService.createQRDisplayURL(grantId, baseURL);

      expect(url).toBe("https://example.com/qr/507f1f77bcf86cd799439011");
    });

    it("should handle empty base URL", () => {
      const grantId = "507f1f77bcf86cd799439011";

      const url = QRCodeService.createQRDisplayURL(grantId);

      expect(url).toBe("/qr/507f1f77bcf86cd799439011");
    });
  });

  describe("createScanURL", () => {
    it("should create correct scan URL", () => {
      const grantId = "507f1f77bcf86cd799439011";
      const baseURL = "https://example.com";

      const url = QRCodeService.createScanURL(grantId, baseURL);

      expect(url).toBe("https://example.com/scan/507f1f77bcf86cd799439011");
    });

    it("should handle empty base URL", () => {
      const grantId = "507f1f77bcf86cd799439011";

      const url = QRCodeService.createScanURL(grantId);

      expect(url).toBe("/scan/507f1f77bcf86cd799439011");
    });
  });
});
