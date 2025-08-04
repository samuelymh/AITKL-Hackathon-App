import { createHmac } from 'crypto';

export interface JWTPayload {
  digitalIdentifier: string;
  type?: string;
  [key: string]: any;
}

export class JWT {
  private static readonly SECRET = process.env.JWT_SECRET as string;
  private static readonly ALGORITHM = process.env.JWT_ALGORITHM as string;

  /**
   * Encode a payload into a JWT token
   * @param payload - The data to encode
   * @param expiresIn - Expiration time in seconds
   * @returns JWT token string
   */
  static encode(payload: JWTPayload, expiresIn: number): string {
    const header = {
      alg: this.ALGORITHM,
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url'
    );
    const encodedPayload = Buffer.from(JSON.stringify(claims)).toString(
      'base64url'
    );

    const signature = createHmac('sha256', this.SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Decode and verify a JWT token
   * @param token - The JWT token to decode
   * @returns The decoded payload
   * @throws Error if token is invalid, expired, or has invalid signature
   */
  static decode(token: string): JWTPayload & { iat: number; exp: number } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac('sha256', this.SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid JWT signature');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString()
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('JWT has expired');
    }

    return payload;
  }

  /**
   * Verify if a token is valid without throwing an error
   * @param token - The JWT token to verify
   * @returns true if valid, false otherwise
   */
  static isValid(token: string): boolean {
    try {
      this.decode(token);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the expiration time of a JWT token
   * @param token - The JWT token
   * @returns Date object representing expiration time, or null if invalid
   */
  static getExpiration(token: string): Date | null {
    try {
      const payload = this.decode(token);
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Check if a JWT token is expired
   * @param token - The JWT token
   * @returns true if expired, false otherwise
   */
  static isExpired(token: string): boolean {
    const expiration = this.getExpiration(token);
    if (!expiration) return true;
    return expiration.getTime() < Date.now();
  }
}
