import { NextResponse } from "next/server";
import { ensureCsrfCookie } from "@/lib/server/session";

export async function GET() {
  return NextResponse.json({ token: await ensureCsrfCookie() });
}
