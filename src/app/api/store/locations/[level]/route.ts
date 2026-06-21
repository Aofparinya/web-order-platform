import { NextRequest, NextResponse } from "next/server";
import {
  currentStorefrontUser,
  storefrontLocations,
  StorefrontError,
} from "@/lib/server/storefront";

interface Context {
  params: Promise<{ level: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await currentStorefrontUser();
    const { level } = await context.params;
    return NextResponse.json(
      await storefrontLocations(level, request.nextUrl.searchParams),
      { headers: { "cache-control": "public, max-age=3600" } },
    );
  } catch (error) {
    if (error instanceof StorefrontError) {
      return NextResponse.json(
        { message: error.message, statusCode: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { message: "ไม่สามารถโหลดข้อมูลที่อยู่ได้", statusCode: 500 },
      { status: 500 },
    );
  }
}
