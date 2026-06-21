"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/components/storefront/cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type {
  StorefrontAddressInput,
  StorefrontCheckoutResult,
} from "@/types/storefront";

const initialAddress: StorefrontAddressInput = {
  line1: "",
  line2: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  countryCode: "TH",
};

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clear } = useCart();
  const [address, setAddress] =
    useState<StorefrontAddressInput>(initialAddress);
  const checkout = useMutation({
    mutationFn: () =>
      apiFetch<StorefrontCheckoutResult>("/api/store/checkout", {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          warehouseId: items[0]?.warehouseId,
          items: items.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
          })),
          billingAddress: address,
          shippingAddress: address,
        }),
      }),
    onSuccess: (result) => {
      clear();
      toast.success(`สร้างคำสั่งซื้อ ${result.order.orderNumber} แล้ว`);
      if (result.paymentId) {
        window.location.assign(`/store/payment/${result.paymentId}`);
      } else {
        window.location.assign("/store/orders");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const addressReady =
    address.line1 &&
    address.province &&
    address.postalCode &&
    address.countryCode.length === 2;

  if (!items.length) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-20 text-center">
          <ShoppingBag className="mx-auto size-12 text-slate-300" />
          <h1 className="mt-4 text-2xl font-bold">ตะกร้ายังว่าง</h1>
          <p className="mt-2 text-slate-500">
            เลือกสินค้าจากคลัง แล้วกลับมาตรวจสอบรายการที่นี่
          </p>
          <Button asChild className="mt-6">
            <Link href="/store">เลือกซื้อสินค้า</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-7">
        <Button asChild variant="ghost" className="-ml-3">
          <Link href="/store">
            <ArrowLeft /> เลือกสินค้าต่อ
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          ตะกร้าสินค้า
        </h1>
        <p className="mt-1 text-slate-500">
          คลัง {items[0].warehouseName} · ระบบจะ reserve stock หลังยืนยัน
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.skuId}>
              <CardContent className="flex gap-4 p-4 sm:items-center">
                <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {item.imageUrl && (
                    <div
                      role="img"
                      aria-label={item.productName}
                      className="size-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${item.imageUrl}")` }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-slate-950">
                    {item.productName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {item.skuCode} · {item.skuName}
                  </p>
                  <p className="mt-2 font-semibold text-blue-700">
                    {formatCurrency(item.price, item.currency)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.skuId)}
                    aria-label="ลบสินค้า"
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                  <div className="flex items-center rounded-lg border">
                    <button
                      className="grid size-9 place-items-center"
                      onClick={() =>
                        updateQuantity(item.skuId, item.quantity - 1)
                      }
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="min-w-10 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      className="grid size-9 place-items-center"
                      disabled={item.quantity >= item.available}
                      onClick={() =>
                        updateQuantity(item.skuId, item.quantity + 1)
                      }
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="grid gap-3 p-5">
              <div>
                <h2 className="font-bold">ที่อยู่จัดส่งและออกเอกสาร</h2>
                <p className="mt-1 text-xs text-slate-500">
                  MVP ใช้ที่อยู่เดียวกันสำหรับ Billing และ Shipping
                </p>
              </div>
              <Input
                placeholder="บ้านเลขที่ ถนน อาคาร"
                value={address.line1}
                onChange={(event) =>
                  setAddress({ ...address, line1: event.target.value })
                }
              />
              <Input
                placeholder="รายละเอียดเพิ่มเติม"
                value={address.line2}
                onChange={(event) =>
                  setAddress({ ...address, line2: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="แขวง/ตำบล"
                  value={address.subdistrict}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      subdistrict: event.target.value,
                    })
                  }
                />
                <Input
                  placeholder="เขต/อำเภอ"
                  value={address.district}
                  onChange={(event) =>
                    setAddress({ ...address, district: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-[1fr_130px] gap-3">
                <Input
                  placeholder="จังหวัด"
                  value={address.province}
                  onChange={(event) =>
                    setAddress({ ...address, province: event.target.value })
                  }
                />
                <Input
                  placeholder="รหัสไปรษณีย์"
                  value={address.postalCode}
                  onChange={(event) =>
                    setAddress({ ...address, postalCode: event.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-300">
            <CardContent className="p-5">
              <h2 className="font-bold">สรุปคำสั่งซื้อ</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-slate-500">สินค้า</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น</span>
              </div>
              <div className="mt-3 flex justify-between border-t pt-4 text-lg font-bold">
                <span>ยอดรวม</span>
                <span>
                  {formatCurrency(subtotal, items[0]?.currency ?? "THB")}
                </span>
              </div>
              <Button
                className="mt-5 w-full"
                size="lg"
                disabled={!addressReady || checkout.isPending}
                onClick={() => checkout.mutate()}
              >
                {checkout.isPending
                  ? "กำลังตรวจสต็อกและสร้างคำสั่งซื้อ..."
                  : "ยืนยันและไปชำระเงิน"}
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500">
                ราคาสุดท้ายคำนวณโดย Order Service และตรวจสต็อกแบบ row lock
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
