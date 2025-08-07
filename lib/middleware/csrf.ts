import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

// CSRF token configuration
const CSRF_SECRET =
  process.env.CSRF_SECRET || "default-csrf-secret-change-in-production";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  const randomToken = randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  const hmac = createHash("sha256")
    .update(randomToken + CSRF_SECRET)
    .digest("hex");
  return `${randomToken}.${hmac}`;
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [randomToken, providedHmac] = parts;
  const expectedHmac = createHash("sha256")
    .update(randomToken + CSRF_SECRET)
    .digest("hex");

  return providedHmac === expectedHmac;
}

/**
 * CSRF protection middleware for API routes
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: {
    methods?: string[];
  } = {},
) {
  const { methods = ["POST", "PUT", "PATCH", "DELETE"] } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    // Only check CSRF for specified methods
    if (!methods.includes(request.method)) {
      return await handler(request);
    }

    // Get CSRF token from header
    const csrfToken = request.headers.get("x-csrf-token");

    if (!csrfToken || !verifyCSRFToken(csrfToken)) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 },
      );
    }

    return await handler(request);
  };
}

/**
 * API endpoint to get CSRF token
 */
export async function GET() {
  const token = generateCSRFToken();

  return NextResponse.json({
    success: true,
    data: { csrfToken: token },
  });
}
