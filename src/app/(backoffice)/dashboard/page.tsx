"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/providers";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import type { Customer, Order, Page, Product, Reservation, Stock } from "@/types/api";

export default function DashboardPage() {
  const { user } = useSession();
  const customerAccess = can(user, permissions.customersRead);
  const catalogAccess = can(user, permissions.catalogRead);
  const inventoryAccess = can(user, permissions.inventoryRead);
  const orderAccess = can(user, permissions.ordersRead);
  const customers = useQuery({
    queryKey: ["dashboard", "customers"],
    queryFn: () => apiFetch<Page<Customer>>("customers?page=1&pageSize=5"),
    enabled: customerAccess,
  });
  const products = useQuery({
    queryKey: ["dashboard", "products"],
    queryFn: () => apiFetch<Page<Product>>("products?page=1&pageSize=5"),
    enabled: catalogAccess,
  });
  const lowStock = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () =>
      apiFetch<Page<Stock>>("inventory?lowStock=true&page=1&pageSize=5"),
    enabled: inventoryAccess,
  });
  const reservations = useQuery({
    queryKey: ["dashboard", "reservations"],
    queryFn: () =>
      apiFetch<Page<Reservation>>(
        "inventory/reservations?status=PENDING&page=1&pageSize=5",
      ),
    enabled: inventoryAccess,
  });
  const orders = useQuery({
    queryKey: ["dashboard", "orders"],
    queryFn: () =>
      apiFetch<Page<Order>>("orders?page=1&pageSize=5&status=PENDING_PAYMENT"),
    enabled: orderAccess,
  });

  if (!user) return <LoadingState />;
  return (
    <>
      <PageHeader
        title={`สวัสดี ${user.firstName}`}
        description="ภาพรวมข้อมูลที่คุณมีสิทธิ์เข้าถึงใน Order Platform"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {customerAccess && (
          <Metric
            label="ลูกค้าทั้งหมด"
            value={customers.data?.pagination.total}
            icon={Users}
            color="blue"
          />
        )}
        {catalogAccess && (
          <Metric
            label="สินค้าทั้งหมด"
            value={products.data?.pagination.total}
            icon={Package}
            color="indigo"
          />
        )}
        {inventoryAccess && (
          <Metric
            label="รายการสต็อกต่ำ"
            value={lowStock.data?.pagination.total}
            icon={AlertTriangle}
            color="amber"
          />
        )}
        {orderAccess && (
          <Metric
            label="คำสั่งซื้อรอชำระ"
            value={orders.data?.pagination.total}
            icon={ShoppingCart}
            color="blue"
          />
        )}
        {inventoryAccess && (
          <Metric
            label="การจองที่รอดำเนินการ"
            value={reservations.data?.pagination.total}
            icon={Boxes}
            color="emerald"
          />
        )}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-slate-900">รายการล่าสุด</h2>
            <div className="mt-4 space-y-3">
              {customers.data?.data.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                >
                  <span>
                    <strong className="block text-sm">
                      {customer.companyName ??
                        `${customer.firstName ?? ""} ${customer.lastName ?? ""}`}
                    </strong>
                    <small className="text-slate-500">{customer.customerNo}</small>
                  </span>
                  <span className="text-xs text-slate-500">{customer.status}</span>
                </Link>
              ))}
              {products.data?.data.map((product) => (
                <Link
                  key={product.id}
                  href={`/catalog/products/${product.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                >
                  <span>
                    <strong className="block text-sm">{product.name}</strong>
                    <small className="text-slate-500">{product.productNo}</small>
                  </span>
                  <span className="text-xs text-slate-500">{product.status}</span>
                </Link>
              ))}
              {orders.data?.data.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                >
                  <span>
                    <strong className="block text-sm">{order.orderNumber}</strong>
                    <small className="text-slate-500">{order.status}</small>
                  </span>
                  <span className="text-xs text-slate-500">{order.currency} {order.totalAmount}</span>
                </Link>
              ))}
              {!customers.data?.data.length && !products.data?.data.length && (
                <p className="py-8 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลล่าสุด
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold text-slate-900">เมนูลัด</h2>
            <div className="mt-4 grid gap-3">
              {can(user, permissions.customersWrite) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/customers">
                    <Plus /> เพิ่มลูกค้า
                  </Link>
                </Button>
              )}
              {can(user, permissions.catalogWrite) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/catalog/products">
                    <Plus /> เพิ่มสินค้า
                  </Link>
                </Button>
              )}
              {can(user, permissions.inventoryWrite) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/inventory/stock">
                    <Plus /> ปรับสต็อก
                  </Link>
                </Button>
              )}
              {can(user, permissions.ordersWrite) && (
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/orders/new">
                    <Plus /> สร้างคำสั่งซื้อ
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="justify-start">
                <Link href="/profile">ดูข้อมูลบัญชี</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const metricColors = {
  blue: "bg-blue-50 text-blue-600",
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

function Metric({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value?: number;
  icon: typeof Users;
  color: keyof typeof metricColors;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid size-12 place-items-center rounded-xl ${metricColors[color]}`}>
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <strong className="text-2xl text-slate-950">
            {value === undefined ? "—" : formatNumber(value)}
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}
