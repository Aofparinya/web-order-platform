"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatDateTime } from "@/lib/utils";
import type { Page, Product, Reservation, Sku, Warehouse } from "@/types/api";

export default function ReservationsPage() {
  const { user } = useSession();
  const writable = can(user, permissions.inventoryWrite);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ warehouseId: "", status: "", referenceType: "", referenceId: "", page: 1, pageSize: 20 });
  const [form, setForm] = useState(() => ({ warehouseId: "", referenceType: "ORDER", referenceId: "", expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16), skuId: "", quantity: 1 }));
  const reservations = useQuery({ queryKey: ["reservations", filters], queryFn: () => apiFetch<Page<Reservation>>(`inventory/reservations${toQueryString(filters)}`) });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const products = useQuery({ queryKey: ["products", "for-reservation"], queryFn: () => apiFetch<Page<Product>>("products?page=1&pageSize=100") });
  const skus = useQuery({ queryKey: ["skus", "for-reservation", products.data?.data], enabled: Boolean(products.data), queryFn: async () => (await Promise.all(products.data!.data.map((product) => apiFetch<Sku[]>(`products/${product.id}/skus`)))).flat() });
  const create = useMutation({
    mutationFn: () => apiFetch<Reservation>("inventory/reservations", { method: "POST", body: JSON.stringify({ warehouseId: form.warehouseId, referenceType: form.referenceType, referenceId: form.referenceId, expiresAt: new Date(form.expiresAt).toISOString(), items: [{ skuId: form.skuId, quantity: form.quantity }] }) }),
    onSuccess: () => { toast.success("จองสต็อกแล้ว"); queryClient.invalidateQueries({ queryKey: ["reservations"] }); queryClient.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (error) => toast.error(error.message),
  });
  const columns: ColumnDef<Reservation>[] = [
    { header: "Reference", cell: ({ row }) => <Link className="font-semibold text-blue-700" href={`/inventory/reservations/${row.original.id}`}>{row.original.referenceType} · {row.original.referenceId}</Link> },
    { header: "คลัง", cell: ({ row }) => warehouses.data?.find((item) => item.id === row.original.warehouseId)?.code ?? row.original.warehouseId },
    { header: "สถานะ", cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "รายการ", cell: ({ row }) => row.original.items.reduce((total, item) => total + item.quantity, 0) },
    { header: "หมดอายุ", cell: ({ row }) => formatDateTime(row.original.expiresAt) },
  ];
  return <PermissionGate permission={permissions.inventoryRead}>
    <PageHeader title="การจองสต็อก" description="Reserve, confirm, release และติดตาม expiration" />
    {writable && <Card className="mb-5"><CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4"><Select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">เลือกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select><Select value={form.skuId} onChange={(event) => setForm({ ...form, skuId: event.target.value })}><option value="">เลือก SKU</option>{skus.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select><Input placeholder="Reference Type" value={form.referenceType} onChange={(event) => setForm({ ...form, referenceType: event.target.value })} /><Input placeholder="Reference ID" value={form.referenceId} onChange={(event) => setForm({ ...form, referenceId: event.target.value })} /><Input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /><Input type="number" min={1} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /><Button className="md:col-span-2" onClick={() => create.mutate()}><Plus /> จองสต็อก</Button></CardContent></Card>}
    <div className="mb-4 grid gap-3 md:grid-cols-4"><Select value={filters.warehouseId} onChange={(event) => setFilters({ ...filters, warehouseId: event.target.value, page: 1 })}><option value="">ทุกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select><Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">ทุกสถานะ</option><option>PENDING</option><option>CONFIRMED</option><option>RELEASED</option><option>EXPIRED</option></Select><Input placeholder="Reference Type" value={filters.referenceType} onChange={(event) => setFilters({ ...filters, referenceType: event.target.value, page: 1 })} /><Input placeholder="Reference ID" value={filters.referenceId} onChange={(event) => setFilters({ ...filters, referenceId: event.target.value, page: 1 })} /></div>
    {reservations.isLoading ? <LoadingState /> : <DataTable data={reservations.data?.data ?? []} columns={columns} />}
    <Pagination pagination={reservations.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
  </PermissionGate>;
}
