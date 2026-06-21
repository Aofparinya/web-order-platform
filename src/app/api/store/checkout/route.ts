import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertCsrf } from "@/lib/server/security";
import {
  checkout,
  currentStorefrontUser,
  StorefrontError,
} from "@/lib/server/storefront";

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).optional(),
  subdistrict: z.string().trim().max(150).optional(),
  district: z.string().trim().max(150).optional(),
  province: z.string().trim().min(1).max(150),
  postalCode: z.string().trim().min(1).max(20),
  countryCode: z.string().trim().length(2).default("TH"),
});

const checkoutSchema = z.object({
  warehouseId: z.string().uuid(),
  items: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .min(1)
    .max(100),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
});

export async function POST(request: NextRequest) {
  try {
    assertCsrf(request);
    const user = await currentStorefrontUser();
    const input = checkoutSchema.parse(await request.json());
    const idempotencyKey =
      request.headers.get("idempotency-key") ?? randomUUID();
    return NextResponse.json(
      await checkout(user, input, idempotencyKey),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "ข้อมูลจัดส่งหรือสินค้าไม่ถูกต้อง", statusCode: 400 },
        { status: 400 },
      );
    }
    if (
      error instanceof Error &&
      error.message.startsWith("INVALID_")
    ) {
      const code = error.message;
      return NextResponse.json(
        {
          message:
            code === "INVALID_CSRF"
              ? "CSRF token หมดอายุหรือไม่ตรงกับ session กรุณาลองใหม่"
              : "คำขอไม่ได้มาจากเว็บไซต์นี้",
          code,
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
      { message: "ไม่สามารถสร้างคำสั่งซื้อได้", statusCode: 500 },
      { status: 500 },
    );
  }
}
