import { describe, it, expect, jest } from "@jest/globals";
import { QRCodeService } from "../../../lib/services/qr-code-service";
import { QRCodeGenerationError, TokenGenerationError } from "../../../lib/errors/custom-errors";

// Mock QRCode module with proper typing
const mockToDataURL = jest.fn() as jest.MockedFunction<any>;
const mockToString = jest.fn() as jest.MockedFunction<any>;

jest.mock("qrcode", () => ({
  toDataURL: mockToDataURL,
  toString: mockToString,
}));

describe("QRCodeService", () => {
  const mockDigitalIdentifier = "HID_a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generatePatientQR", () => {
    it("should generate patient QR code successfully", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      const result = await QRCodeService.generatePatientQR(mockDigitalIdentifier);

      expect(result).toBe(mockDataURL);
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.stringContaining('"type":"health_access_request"'),
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

      await QRCodeService.generatePatientQR(mockDigitalIdentifier, options);

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

      await expect(QRCodeService.generatePatientQR(mockDigitalIdentifier)).rejects.toThrow(QRCodeGenerationError);
    });

    it("should include correct payload structure according to knowledge base", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      await QRCodeService.generatePatientQR(mockDigitalIdentifier);

      const callArgs = mockToDataURL.mock.calls[0];
      const payload = JSON.parse(callArgs[0] as string);

      expect(payload).toMatchObject({
        type: "health_access_request",
        import { describe, it, expect, jest } from "@jest/globals";
import { QRCodeService } from "../../../lib/services/qr-code-service";
import { QRCodeGenerationError, TokenGenerationError } from "../../../lib/errors/custom-errors";

// Mock QRCode module with proper typing
const mockToDataURL = jest.fn() as jest.MockedFunction<any>;
const mockToString = jest.fn() as jest.MockedFunction<any>;

jest.mock("qrcode", () => ({
  toDataURL: mockToDataURL,
  toString: mockToString,
}));

describe("QRCodeService", () => {
  const mockDigitalIdentifier = "HID_a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generatePatientQR", () => {
    it("should generate patient QR code successfully", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      const result = await QRCodeService.generatePatientQR(mockDigitalIdentifier);

      expect(result).toBe(mockDataURL);
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.stringContaining('"type":"health_access_request"'),
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

      await QRCodeService.generatePatientQR(mockDigitalIdentifier, options);

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

      await expect(QRCodeService.generatePatientQR(mockDigitalIdentifier)).rejects.toThrow(QRCodeGenerationError);
    });

    it("should include correct payload structure according to knowledge base", async () => {
      const mockDataURL = "data:image/png;base64,mockQRCode";
      mockToDataURL.mockResolvedValue(mockDataURL);

      await QRCodeService.generatePatientQR(mockDigitalIdentifier);

      const callArgs = mockToDataURL.mock.calls[0];
      const payload = JSON.parse(callArgs[0] as string);

      expect(payload).toMatchObject({
        type: "health_access_request",
        digitalIdentifier: mockDigitalIdentifier,
        version: "1.0",
        timestamp: expect.any(String),
      });
    });
  });

  describe("generatePatientQRSVG", () => {
    it("should generate SVG patient QR code successfully", async () => {
      const mockSVG = "<svg>mock SVG content</svg>";
      mockToString.mockResolvedValue(mockSVG);

      const result = await QRCodeService.generatePatientQRSVG(mockDigitalIdentifier);

      expect(result).toBe(mockSVG);
      expect(mockToString).toHaveBeenCalledWith(
        expect.stringContaining('"type":"health_access_request"'),
        expect.objectContaining({
          type: "svg",
          width: 300,
          height: 300,
          margin: 2,
        })
      );
    });

    it("should throw QRCodeGenerationError on SVG failure", async () => {
      mockToString.mockRejectedValue(new Error("SVG generation failed"));

      await expect(QRCodeService.generatePatientQRSVG(mockDigitalIdentifier)).rejects.toThrow(QRCodeGenerationError);
    });
  });

  describe("validatePatientQRCode", () => {
    it("should validate correct QR code data", () => {
      const validQRPayload = {
        type: "health_access_request",
        digitalIdentifier: mockDigitalIdentifier,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      const result = QRCodeService.validatePatientQRCode(JSON.stringify(validQRPayload));

      expect(result).toEqual({
        digitalIdentifier: mockDigitalIdentifier,
        timestamp: validQRPayload.timestamp,
      });
    });

    it("should reject QR code with wrong type", () => {
      const invalidQRPayload = {
        type: "wrong_type",
        digitalIdentifier: mockDigitalIdentifier,
        version: "1.0",
        timestamp: new Date().toISOString(),
      };

      const result = QRCodeService.validatePatientQRCode(JSON.stringify(invalidQRPayload));

      expect(result).toBeNull();
    });

    it("should reject QR code missing required fields", () => {
      const incompleteQRPayload = {
        type: "health_access_request",
        version: "1.0",
        // Missing digitalIdentifier
      };

      const result = QRCodeService.validatePatientQRCode(JSON.stringify(incompleteQRPayload));

      expect(result).toBeNull();
    });

    it("should accept old QR code (older than 24 hours) but log warning", () => {
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      
      const oldQRPayload = {
        type: "health_access_request",
        digitalIdentifier: mockDigitalIdentifier,
        version: "1.0",
        timestamp: oldTimestamp,
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = QRCodeService.validatePatientQRCode(JSON.stringify(oldQRPayload));

      expect(result).toEqual({
        digitalIdentifier: mockDigitalIdentifier,
        timestamp: oldTimestamp,
      });
      expect(consoleSpy).toHaveBeenCalledWith("QR code is older than 24 hours");

      consoleSpy.mockRestore();
    });

    it("should return null for invalid JSON", () => {
      const result = QRCodeService.validatePatientQRCode("invalid json");

      expect(result).toBeNull();
    });
  });

  describe("generateAccessToken", () => {
    it("should generate access token with default expiration", () => {
      const result = QRCodeService.generateAccessToken();

      expect(result).toMatchObject({
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(result.token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should generate access token with custom expiration", () => {
      const customSeconds = 7200; // 2 hours
      const beforeTime = Date.now();
      const result = QRCodeService.generateAccessToken(customSeconds);

      const expectedExpiration = new Date(beforeTime + customSeconds * 1000);
      const tolerance = 1000; // 1 second tolerance

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration.getTime() - tolerance);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration.getTime() + tolerance);
    });

    it("should throw TokenGenerationError on crypto failure", () => {
      // Mock crypto failure
      const originalRandomBytes = require("crypto").randomBytes;
      require("crypto").randomBytes = jest.fn().mockImplementation(() => {
        throw new Error("Crypto error");
      });

      expect(() => QRCodeService.generateAccessToken()).toThrow(TokenGenerationError);

      // Restore original function
      require("crypto").randomBytes = originalRandomBytes;
    });
  });

  describe("generateShortLivedToken", () => {
    it("should generate short-lived token with default 15 minutes", () => {
      const result = QRCodeService.generateShortLivedToken();

      expect(result).toMatchObject({
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });

      const expectedDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      const actualDuration = result.expiresAt.getTime() - Date.now();
      const tolerance = 1000; // 1 second tolerance

      expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
      expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);
    });

    it("should generate short-lived token with custom duration", () => {
      const customSeconds = 600; // 10 minutes
      const result = QRCodeService.generateShortLivedToken(customSeconds);

      const expectedDuration = customSeconds * 1000;
      const actualDuration = result.expiresAt.getTime() - Date.now();
      const tolerance = 1000; // 1 second tolerance

      expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
      expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);
    });
  });

  describe("createPatientQRURL", () => {
    it("should create patient QR URL with base URL", () => {
      const digitalId = "HID_test123";
      const baseURL = "https://health-app.com";

      const url = QRCodeService.createPatientQRURL(digitalId, baseURL);

      expect(url).toBe("https://health-app.com/patient/qr/HID_test123");
    });

    it("should create patient QR URL without base URL", () => {
      const digitalId = "HID_test123";

      const url = QRCodeService.createPatientQRURL(digitalId);

      expect(url).toBe("/patient/qr/HID_test123");
    });
  });

  describe("createAuthRequestURL", () => {
    it("should create authorization request URL with base URL", () => {
      const baseURL = "https://health-app.com";

      const url = QRCodeService.createAuthRequestURL(baseURL);

      expect(url).toBe("https://health-app.com/api/v1/authorizations/request");
    });

    it("should create authorization request URL without base URL", () => {
      const url = QRCodeService.createAuthRequestURL();

      expect(url).toBe("/api/v1/authorizations/request");
    });
  });
});
    });
  });

  describe("generatePatientQRSVG", () => {
    it("should generate SVG patient QR code successfully", async () => {
      const mockSVG = "<svg>mock SVG content</svg>";
      mockToString.mockResolvedValue(mockSVG);

      const result = await QRCodeService.generatePatientQRSVG(mockDigitalIdentifier);

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
