import { NextRequest, NextResponse } from "next/server";
import { accessConfigured, accessRequired, validStaffAuthorization } from "./lib/access";

export function proxy(request: NextRequest) {
  if (!accessRequired()) return NextResponse.next();
  if (!accessConfigured()) return new NextResponse("Staff access has not been configured.", { status: 503 });
  if (!validStaffAuthorization(request.headers.get("authorization"))) {
    return new NextResponse("Please sign in with your staff credentials.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="HHP staff", charset="UTF-8"', "Cache-Control": "no-store" },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
