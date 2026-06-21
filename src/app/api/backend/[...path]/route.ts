import { NextRequest, NextResponse } from "next/server";
import { forwardWithSession, jsonResponse } from "@/lib/server/gateway";
import { assertCsrf } from "@/lib/server/security";

const readMethods = new Set(["GET", "HEAD", "OPTIONS"]);

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    if (!path.length || path.some((segment) => segment === "..")) {
      return NextResponse.json({ message: "Invalid API path" }, { status: 400 });
    }
    if (!readMethods.has(request.method)) {
      assertCsrf(request);
    }
    const body = readMethods.has(request.method)
      ? undefined
      : await request.arrayBuffer();
    const response = await forwardWithSession(
      `${path.join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        body,
        headers: {
          "content-type":
            request.headers.get("content-type") ?? "application/json",
        },
      },
    );
    return jsonResponse(response);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_")) {
      return NextResponse.json(
        {
          message: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย",
          code: error.message,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { message: "ไม่สามารถเชื่อมต่อ API Gateway ได้" },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
