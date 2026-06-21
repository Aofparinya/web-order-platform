import { NextRequest, NextResponse } from "next/server";
import { assertCsrf } from "@/lib/server/security";
import {
  currentStorefrontUser,
  retryStorefrontPayment,
  storefrontPaymentCheckout,
  StorefrontError,
} from "@/lib/server/storefront";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await currentStorefrontUser();
    const { id } = await context.params;
    return NextResponse.json(await storefrontPaymentCheckout(user, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error, "ไม่สามารถโหลดข้อมูลการชำระเงินได้");
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    assertCsrf(request);
    const user = await currentStorefrontUser();
    const { id } = await context.params;
    return NextResponse.json({
      payment: await retryStorefrontPayment(user, id),
    });
  } catch (error) {
    return errorResponse(error, "ไม่สามารถสร้าง Stripe Checkout ใหม่ได้");
  }
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.startsWith("INVALID_")) {
    return NextResponse.json(
      {
        message: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย",
        code: error.message,
        statusCode: 403,
      },
      { status: 403 },
    );
  }
  if (error instanceof StorefrontError) {
    return NextResponse.json(
      { message: error.message, statusCode: error.status },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { message: fallback, statusCode: 500 },
    { status: 500 },
  );
}
