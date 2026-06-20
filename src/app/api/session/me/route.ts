import { forwardWithSession, jsonResponse } from "@/lib/server/gateway";

export async function GET() {
  return jsonResponse(await forwardWithSession("auth/me"));
}
