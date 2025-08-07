import { NextRequest, NextResponse } from "next/server";
import { Environment } from "@/lib/utils/environment";
import { HttpStatus } from "@/lib/types/enums";

export function withDevOnly(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    if (Environment.isProduction()) {
      return NextResponse.json(
        { error: "Endpoint not available in production" },
        { status: HttpStatus.FORBIDDEN },
      );
    }
    return handler(req);
  };
}

export function checkDevEnvironment(): NextResponse | null {
  if (Environment.isProduction()) {
    return NextResponse.json(
      { error: "Endpoint not available in production" },
      { status: HttpStatus.FORBIDDEN },
    );
  }
  return null;
}
