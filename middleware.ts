import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // For now, just pass through all requests
  // This can be extended later for global middleware like authentication checks
  return NextResponse.next();
}

export const config = {
  // Specify which paths this middleware should run on
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};