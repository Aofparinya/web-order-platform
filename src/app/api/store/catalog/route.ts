import { NextRequest, NextResponse } from "next/server";
import {
  currentStorefrontUser,
  storefrontCatalog,
  StorefrontError,
} from "@/lib/server/storefront";

export async function GET(request: NextRequest) {
  try {
    await currentStorefrontUser();
    const result = await storefrontCatalog(
      request.nextUrl.searchParams.get("warehouseId") ?? undefined,
    );
    return NextResponse.json(result);
  } catch (error) {
    return storeError(error);
  }
}

function storeError(error: unknown) {
  if (error instanceof StorefrontError) {
    return NextResponse.json(
      { message: error.message, statusCode: error.status },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { message: "ไม่สามารถโหลดหน้าร้านได้", statusCode: 500 },
    { status: 500 },
  );
}
