import { describe, it, expect, jest } from "@jest/globals";
import { QRCodeService } from "../../../lib/services/qr-code-service";
import { QRCodeGenerationError, TokenGenerationError } from "../../../lib/errors/custom-errors";

// Mock QRCode module
jest.mock("qrcode", () => ({
  toDataURL: jest.fn(),
  toString: jest.fn(),
}));

// Get the mocked functions
const mockToDataURL = require("qrcode").toDataURL;
const mockToString = require("qrcode").toString;

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

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

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
    const digitalIdentifier = "HID123456";
    const grantId = "grant123";

    it("should generate JWT access token with default expiration", () => {
      const result = QRCodeService.generateAccessToken(digitalIdentifier, grantId);

      expect(result).toMatchObject({
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });

      // JWT tokens are much longer than hex strings
      expect(result.token.length).toBeGreaterThan(100);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Verify the token can be decoded
      const decoded = QRCodeService.verifyAccessToken(result.token);
      expect(decoded).toMatchObject({
        digitalIdentifier,
        grantId,
        purpose: "healthcare_authorization",
      });
    });

    it("should generate JWT access token with custom expiration", () => {
      const customSeconds = 7200; // 2 hours
      const beforeTime = Date.now();
      const result = QRCodeService.generateAccessToken(digitalIdentifier, grantId, customSeconds);

      const expectedExpiration = new Date(beforeTime + customSeconds * 1000);
      const tolerance = 2000; // 2 second tolerance

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration.getTime() - tolerance);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration.getTime() + tolerance);

      // Verify the token contains correct claims
      const decoded = QRCodeService.verifyAccessToken(result.token);
      expect(decoded).toMatchObject({
        digitalIdentifier,
        grantId,
        purpose: "healthcare_authorization",
      });
    });

    it("should throw TokenGenerationError on JWT signing failure", () => {
      // Mock jwt.sign failure
      const jwt = require("jsonwebtoken");
      const originalSign = jwt.sign;
      jwt.sign = jest.fn().mockImplementation(() => {
        throw new Error("JWT signing error");
      });

      expect(() => QRCodeService.generateAccessToken(digitalIdentifier, grantId)).toThrow(TokenGenerationError);

      // Restore original function
      jwt.sign = originalSign;
    });
  });

  describe("generateShortLivedToken", () => {
    const digitalIdentifier = "HID123456";
    const grantId = "grant123";

    it("should generate short-lived JWT token with default 15 minutes", () => {
      const result = QRCodeService.generateShortLivedToken(digitalIdentifier, grantId);

      expect(result).toMatchObject({
        token: expect.any(String),
        expiresAt: expect.any(Date),
      });

      const expectedDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      const actualDuration = result.expiresAt.getTime() - Date.now();
      const tolerance = 1000; // 1 second tolerance

      expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
      expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);

      // Verify the token can be decoded
      const decoded = QRCodeService.verifyAccessToken(result.token);
      expect(decoded).toMatchObject({
        digitalIdentifier,
        grantId,
        purpose: "healthcare_authorization",
      });
    });

    it("should generate short-lived JWT token with custom duration", () => {
      const customSeconds = 600; // 10 minutes
      const result = QRCodeService.generateShortLivedToken(digitalIdentifier, grantId, customSeconds);

      const expectedDuration = customSeconds * 1000;
      const actualDuration = result.expiresAt.getTime() - Date.now();
      const tolerance = 1000; // 1 second tolerance

      expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance);
      expect(actualDuration).toBeLessThanOrEqual(expectedDuration + tolerance);
    });
  });

  describe("verifyAccessToken", () => {
    const digitalIdentifier = "HID123456";
    const grantId = "grant123";

    it("should verify valid JWT access token", () => {
      const { token } = QRCodeService.generateAccessToken(digitalIdentifier, grantId);

      const decoded = QRCodeService.verifyAccessToken(token);

      expect(decoded).toMatchObject({
        digitalIdentifier,
        grantId,
        purpose: "healthcare_authorization",
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
      expect(decoded!.exp).toBeGreaterThan(decoded!.iat);
    });

    it("should return null for invalid token", () => {
      const result = QRCodeService.verifyAccessToken("invalid.token.here");

      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      // Generate a token that expires immediately
      const { token } = QRCodeService.generateAccessToken(digitalIdentifier, grantId, -1);

      const result = QRCodeService.verifyAccessToken(token);

      expect(result).toBeNull();
    });

    it("should return null for token with wrong type", () => {
      // Create a token with wrong type using jwt.sign directly
      const jwt = require("jsonwebtoken");
      const wrongToken = jwt.sign(
        { type: "wrong_type", digitalIdentifier, grantId },
        process.env.JWT_SECRET || "your-super-secret-jwt-key"
      );

      const result = QRCodeService.verifyAccessToken(wrongToken);

      expect(result).toBeNull();
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
