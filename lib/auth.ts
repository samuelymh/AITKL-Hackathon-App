import { NextRequest, NextResponse } from 'next/server';
import { JWT, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload & { iat: number; exp: number };
}

/**
 * Middleware to verify JWT token in request headers
 * @param request - The incoming request
 * @returns NextResponse with user data attached if valid, or error response if invalid
 */
export async function verifyToken(
  request: NextRequest
): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const payload = JWT.decode(token);
    return null; // Token is valid, continue with request
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * Extract user data from JWT token in request headers
 * @param request - The incoming request
 * @returns The decoded user payload or null if invalid
 */
export function getUserFromToken(
  request: NextRequest
): (JWTPayload & { iat: number; exp: number }) | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    return JWT.decode(token);
  } catch {
    return null;
  }
}

/**
 * Check if a request has a valid JWT token
 * @param request - The incoming request
 * @returns true if token is valid, false otherwise
 */
export function hasValidToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return JWT.isValid(token);
}

/**
 * Create a JWT token for a user
 * @param digitalIdentifier - The user's digital identifier
 * @param expiresIn - Token expiration time in seconds (default: 30 minutes)
 * @param additionalData - Any additional data to include in the token
 * @returns The JWT token
 */
export function createToken(
  digitalIdentifier: string,
  expiresIn: number = 30 * 60,
  additionalData: Record<string, any> = {}
): string {
  return JWT.encode(
    {
      digitalIdentifier,
      type: 'user_token',
      ...additionalData,
    },
    expiresIn
  );
}
