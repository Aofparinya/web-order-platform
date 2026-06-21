"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageCheck, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, Page } from "@/types/api";

export default function StoreOrdersPage() {
  const orders = useQuery({
    queryKey: ["storefront-orders"],
    queryFn: () => apiFetch<Page<Order>>("/api/store/orders"),
  });

  return (
    <>
      <div className="mb-7">
        <p className="text-sm font-semibold text-blue-600">บัญชีของฉัน</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          คำสั่งซื้อของฉัน
        </h1>
        <p className="mt-1 text-slate-500">
          แสดงเฉพาะคำสั่งซื้อที่ผูกกับบัญชีผู้ใช้นี้
        </p>
      </div>

      {orders.isLoading && (
        <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
      )}
      {orders.isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-12 text-center text-red-700">
            {orders.error.message}
          </CardContent>
        </Card>
      )}
      {!orders.isLoading && !orders.data?.data.length && (
        <Card>
          <CardContent className="py-16 text-center">
            <ReceiptText className="mx-auto size-11 text-slate-300" />
            <h2 className="mt-3 font-bold">ยังไม่มีคำสั่งซื้อ</h2>
            <p className="mt-1 text-sm text-slate-500">
              เมื่อเลือกซื้อสินค้าแล้ว รายการจะปรากฏที่หน้านี้
            </p>
            <Button asChild className="mt-5">
              <Link href="/store">เลือกซื้อสินค้า</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {orders.data?.data.map((order) => {
          const payment = order.payments.at(-1);
          return (
            <Card key={order.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <PackageCheck />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-slate-950">
                      {order.orderNumber}
                    </strong>
                    <Badge value={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(order.createdAt)} · {order.items.length}{" "}
                    รายการ
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <strong className="block text-lg">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </strong>
                  {payment?.checkoutUrl && payment.status !== "CAPTURED" && (
                    <Button asChild size="sm" className="mt-2">
                      <Link href={`/store/payment/${payment.id}`}>
                        ชำระเงิน
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
