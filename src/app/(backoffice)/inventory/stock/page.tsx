"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";
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
import type { Page, Sku, Stock, Warehouse } from "@/types/api";

export default function StockPage() {
  const { user } = useSession();
  const writable = can(user, permissions.inventoryWrite);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ warehouseId: "", skuId: "", lowStock: false, page: 1, pageSize: 20 });
  const [form, setForm] = useState({ warehouseId: "", skuId: "", quantity: 0, reorderLevel: 0, referenceType: "MANUAL", referenceId: "", note: "" });
  const stocks = useQuery({ queryKey: ["inventory", filters], queryFn: () => apiFetch<Page<Stock>>(`inventory${toQueryString(filters)}`) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const products = useQuery({ queryKey: ["products", "all-for-stock"], queryFn: () => apiFetch<Page<{ id: string }>>("products?page=1&pageSize=100") });
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
    <PageHeader title="สต็อกสินค้า" description="Available คำนวณจาก On hand - Reserved" />
    {writable && <Card className="mb-5"><CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4"><Select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">เลือกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select><Select value={form.skuId} onChange={(event) => setForm({ ...form, skuId: event.target.value })}><option value="">เลือก SKU</option>{skus.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select><Input type="number" placeholder="จำนวนที่เพิ่ม/ลด" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /><Input type="number" placeholder="Reorder level" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: Number(event.target.value) })} /><Input placeholder="Reference ID" value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} /><Input placeholder="หมายเหตุ" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /><Button className="md:col-span-2" onClick={() => adjust.mutate()}><SlidersHorizontal /> ปรับสต็อก</Button></CardContent></Card>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Select value={filters.warehouseId} onChange={(event) => setFilters({ ...filters, warehouseId: event.target.value, page: 1 })}><option value="">ทุกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select><Select value={filters.skuId} onChange={(event) => setFilters({ ...filters, skuId: event.target.value, page: 1 })}><option value="">ทุก SKU</option>{skus.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select><label className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm"><input type="checkbox" checked={filters.lowStock} onChange={(event) => setFilters({ ...filters, lowStock: event.target.checked, page: 1 })} /> แสดงเฉพาะสต็อกต่ำ</label></div>
    {stocks.isLoading ? <LoadingState /> : <DataTable data={stocks.data?.data ?? []} columns={columns} />}
    <Pagination pagination={stocks.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
  </PermissionGate>;
}
