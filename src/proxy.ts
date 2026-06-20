import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/session";

const publicRoutes = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  const isPublic =
    publicRoutes.has(pathname) || pathname.startsWith("/payment/");

  if (publicRoutes.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (
    !isPublic &&
    !pathname.startsWith("/api/") &&
    !hasSession
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
