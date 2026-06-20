import type { NextRequest } from "next/server";
import { CSRF_COOKIE } from "./session";

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    const originUrl = new URL(origin);
    const requestHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!requestHost || originUrl.host !== requestHost) {
      throw new Error("INVALID_ORIGIN");
    }
  }
}

export function assertCsrf(request: NextRequest) {
  assertSameOrigin(request);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("INVALID_CSRF");
  }
}
