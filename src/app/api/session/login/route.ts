import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas/auth";
import { gatewayFetch } from "@/lib/server/gateway";
import { assertSameOrigin } from "@/lib/server/security";
import { setSessionCookies, type TokenPair } from "@/lib/server/session";
import type { AuthUser } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = loginSchema.parse(await request.json());
    const response = await gatewayFetch("auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return new Response(await response.text(), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    }
    const tokens = (await response.json()) as TokenPair;
    await setSessionCookies(tokens);
    const meResponse = await gatewayFetch("auth/me", {}, tokens.accessToken);
    const user = (await meResponse.json()) as AuthUser;
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message === "INVALID_ORIGIN"
            ? "คำขอไม่ได้มาจากเว็บไซต์นี้"
            : "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง",
      },
      { status: 400 },
    );
  }
}
