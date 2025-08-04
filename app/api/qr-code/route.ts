import { NextRequest, NextResponse } from 'next/server';
import { JWT, JWTPayload } from '@/lib/jwt';

interface QrCodeRequest {
  digitalIdentifier: string;
}

interface QrCodeResponse {
  token: string;
  expiresAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: QrCodeRequest = await request.json();

    // Validate required fields
    if (!body.digitalIdentifier) {
      return NextResponse.json(
        { error: 'Missing required fields: digitalIdentifier' },
        { status: 400 }
      );
    }

    // todo: remove
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate JWT token with digital identifier and expiry time
    const expiresIn = 30 * 60; // 30 minutes in seconds
    const token = JWT.encode(
      {
        digitalIdentifier: body.digitalIdentifier,
        type: 'qr_code',
      },
      expiresIn
    );

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const response: QrCodeResponse = {
      token,
      expiresAt,
    };

    // Simulate occasional API failures for testing
    if (Math.random() < 0.1) {
      // 10% chance of failure
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('QR Code API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for health check
export async function GET() {
  return NextResponse.json(
    { status: 'QR Code API is running', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
