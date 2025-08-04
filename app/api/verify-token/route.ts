import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, hasValidToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if the request has a valid token
    if (!hasValidToken(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing token' },
        { status: 401 }
      );
    }

    // Extract user data from the token
    const user = getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to decode token' },
        { status: 401 }
      );
    }

    // Return the user information
    return NextResponse.json(
      {
        success: true,
        user: {
          digitalIdentifier: user.digitalIdentifier,
          type: user.type,
          issuedAt: new Date(user.iat * 1000).toISOString(),
          expiresAt: new Date(user.exp * 1000).toISOString(),
          isExpired: user.exp < Math.floor(Date.now() / 1000),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Token verification endpoint',
      usage: 'Send a POST request with Authorization: Bearer <token> header',
    },
    { status: 200 }
  );
}
