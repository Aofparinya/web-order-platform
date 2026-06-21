import { NextResponse } from "next/server";
import {
  currentStorefrontUser,
  storefrontOrders,
  StorefrontError,
} from "@/lib/server/storefront";

export async function GET() {
  try {
    const user = await currentStorefrontUser();
    return NextResponse.json(await storefrontOrders(user));
  } catch (error) {
    if (error instanceof StorefrontError) {
      return NextResponse.json(
        { message: error.message, statusCode: error.status },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { message: "ไม่สามารถโหลดคำสั่งซื้อได้", statusCode: 500 },
      { status: 500 },
    );
  }
}
