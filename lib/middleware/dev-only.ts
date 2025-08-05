import { NextRequest, NextResponse } from "next/server";

export function withDevOnly(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Endpoint not available in production" }, { status: 403 });
    }
    return handler(req);
  };
}

export function checkDevEnvironment(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not available in production" }, { status: 403 });
  }
  return null;
}
