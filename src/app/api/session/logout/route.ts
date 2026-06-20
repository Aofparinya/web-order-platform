import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { gatewayFetch } from "@/lib/server/gateway";
import { assertCsrf } from "@/lib/server/security";
import {
  clearSessionCookies,
  REFRESH_COOKIE,
} from "@/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      await gatewayFetch("auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
    await clearSessionCookies();
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "CSRF token ไม่ถูกต้อง" }, { status: 403 });
  }
}
