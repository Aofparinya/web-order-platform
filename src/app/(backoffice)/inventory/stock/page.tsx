"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { Page, Product, Sku, Stock, Warehouse } from "@/types/api";

export default function StockPage() {
  const searchParams = useSearchParams();
  const initialSkuId = searchParams.get("skuId") ?? "";
  const { user } = useSession();
  const writable = can(user, permissions.inventoryWrite);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ warehouseId: "", skuId: initialSkuId, lowStock: false, page: 1, pageSize: 20 });
  const [form, setForm] = useState({ warehouseId: "", skuId: initialSkuId, quantity: 0, reorderLevel: 0, referenceType: "MANUAL", referenceId: "", note: "" });
  const stocks = useQuery({ queryKey: ["inventory", filters], queryFn: () => apiFetch<Page<Stock>>(`inventory${toQueryString(filters)}`) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const products = useQuery({ queryKey: ["products", "all-for-stock"], queryFn: () => apiFetch<Page<Product>>("products?page=1&pageSize=100") });
  const skus = useQuery({
    queryKey: ["skus", products.data?.data],
    enabled: Boolean(products.data),
    queryFn: async () => {
      const lists = await Promise.all(products.data!.data.map((product) => apiFetch<Sku[]>(`products/${product.id}/skus`)));
      return lists.flat();
    },
  });
  const adjust = useMutation({
    mutationFn: () => apiFetch<Stock>("inventory/adjustments", { method: "POST", body: JSON.stringify({ ...form, referenceId: form.referenceId || undefined, note: form.note || undefined }) }),
    onSuccess: () => { toast.success("ปรับสต็อกแล้ว"); queryClient.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (error) => toast.error(error.message),
  });
  const skuOptions = (skus.data ?? []).filter((item) => item.status === "ACTIVE");
  const skuLabel = (item: Sku) => {
    const product = products.data?.data.find(
      (productItem) => productItem.id === item.productId,
    );
    return `${product?.name ?? "ไม่พบ Product"} · ${item.code} · ${item.name}`;
  };
  const columns: ColumnDef<Stock>[] = [
    { header: "คลัง", cell: ({ row }) => warehouses.data?.find((item) => item.id === row.original.warehouseId)?.code ?? row.original.warehouseId },
    { header: "SKU", cell: ({ row }) => skus.data?.find((item) => item.id === row.original.skuId)?.code ?? row.original.skuId },
    { header: "On hand", cell: ({ row }) => formatNumber(row.original.onHand) },
    { header: "Reserved", cell: ({ row }) => formatNumber(row.original.reserved) },
    { header: "Available", cell: ({ row }) => <strong className={row.original.available <= row.original.reorderLevel ? "text-red-600" : "text-emerald-700"}>{formatNumber(row.original.available)}</strong> },
    { header: "Reorder", cell: ({ row }) => formatNumber(row.original.reorderLevel) },
    { header: "อัปเดต", cell: ({ row }) => formatDateTime(row.original.updatedAt) },
  ];
  return <PermissionGate permission={permissions.inventoryRead}>
    <PageHeader title="สต็อกสินค้า" description="เพิ่มหรือลดจำนวนสินค้าของแต่ละ SKU ในแต่ละคลัง" />
    {writable && <Card className="mb-5"><CardContent className="p-5"><div><h2 className="font-bold text-slate-950">ปรับจำนวนสินค้า</h2><p className="mt-1 text-sm text-slate-500">เลือกคลังและ SKU จากนั้นใส่จำนวนที่ต้องการเพิ่มหรือลด ระบบจะสร้างรายการสต็อกให้อัตโนมัติ</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StockField label="คลังสินค้า"><Select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">เลือกคลังที่ต้องการปรับ</option>{warehouses.data?.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select></StockField><StockField label="สินค้า / SKU"><Select value={form.skuId} onChange={(event) => setForm({ ...form, skuId: event.target.value })}><option value="">เลือกสินค้าที่ต้องการปรับ</option>{skuOptions.map((item) => <option key={item.id} value={item.id}>{skuLabel(item)}</option>)}</Select></StockField><StockField label="จำนวนที่เพิ่มหรือลด" hint="ตัวอย่าง: 10 เพื่อเพิ่ม, -2 เพื่อลด"><Input type="number" placeholder="เช่น 10 หรือ -2" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></StockField><StockField label="จุดแจ้งเตือนสต็อกต่ำ" hint="แจ้งเตือนเมื่อ Available ต่ำกว่าค่านี้"><Input type="number" min={0} placeholder="เช่น 5" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: Number(event.target.value) })} /></StockField><StockField label="เลขอ้างอิง" hint="ไม่บังคับ"><Input placeholder="เช่น PO-20260622-001" value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} /></StockField><StockField label="หมายเหตุ" hint="ไม่บังคับ"><Input placeholder="เหตุผลที่ปรับสต็อก" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></StockField><Button className="md:col-span-2" disabled={!form.warehouseId || !form.skuId || form.quantity === 0 || adjust.isPending} onClick={() => adjust.mutate()}><SlidersHorizontal /> {adjust.isPending ? "กำลังบันทึก..." : form.quantity < 0 ? `ลดสต็อก ${Math.abs(form.quantity)}` : `เพิ่มสต็อก ${form.quantity}`}</Button>{!skus.isLoading && skuOptions.length === 0 && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 md:col-span-2 xl:col-span-4">ยังไม่มี SKU ที่พร้อมใช้งาน กรุณาเพิ่ม SKU ในหน้าสินค้าก่อน <Link className="font-semibold underline" href="/catalog/products">ไปหน้าสินค้า</Link></div>}</div></CardContent></Card>}
    <Card className="mb-4 shadow-none"><CardContent className="grid gap-4 p-4 sm:grid-cols-3"><StockField label="กรองตามคลัง"><Select value={filters.warehouseId} onChange={(event) => setFilters({ ...filters, warehouseId: event.target.value, page: 1 })}><option value="">ทุกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select></StockField><StockField label="กรองตามสินค้า / SKU"><Select value={filters.skuId} onChange={(event) => setFilters({ ...filters, skuId: event.target.value, page: 1 })}><option value="">ทุก SKU</option>{skuOptions.map((item) => <option key={item.id} value={item.id}>{skuLabel(item)}</option>)}</Select></StockField><label className="flex h-10 items-center gap-2 self-end rounded-lg border bg-white px-3 text-sm"><input type="checkbox" checked={filters.lowStock} onChange={(event) => setFilters({ ...filters, lowStock: event.target.checked, page: 1 })} /> แสดงเฉพาะสต็อกต่ำ</label></CardContent></Card>
    {stocks.isLoading ? <LoadingState /> : <DataTable data={stocks.data?.data ?? []} columns={columns} />}
    <Pagination pagination={stocks.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
  </PermissionGate>;
}

function StockField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}</label>;
}
