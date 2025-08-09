import { NextResponse } from "next/server";
import { HttpStatus } from "@/lib/constants";

/**
 * Creates a standardized error response
 * Improves consistency and reduces boilerplate
 */
export function createErrorResponse(message: string, status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Creates a standardized success response
 * Ensures consistent response format across all endpoints
 */
export function createSuccessResponse(data: any, status: HttpStatus = HttpStatus.OK) {
  return NextResponse.json({ success: true, data }, { status });
}
