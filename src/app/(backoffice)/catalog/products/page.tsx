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
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatDateTime } from "@/lib/utils";
import type { Category, Page, Product } from "@/types/api";

export default function ProductsPage() {
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: "", status: "", categoryId: "", page: 1, pageSize: 20 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "DRAFT" });
  const products = useQuery({ queryKey: ["products", filters], queryFn: () => apiFetch<Page<Product>>(`products${toQueryString(filters)}`) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("categories") });
  const create = useMutation({
    mutationFn: () => apiFetch<Product>("products", { method: "POST", body: JSON.stringify({ ...form, description: form.description || undefined }) }),
    onSuccess: () => { toast.success("สร้างสินค้าแล้ว"); setOpen(false); queryClient.invalidateQueries({ queryKey: ["products"] }); },
    onError: (error) => toast.error(error.message),
  });
  const columns: ColumnDef<Product>[] = [
    { header: "เลขสินค้า", cell: ({ row }) => <Link className="font-semibold text-blue-700" href={`/catalog/products/${row.original.id}`}>{row.original.productNo}</Link> },
    { header: "ชื่อสินค้า", accessorKey: "name" },
    { header: "สถานะ", cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "อัปเดตล่าสุด", cell: ({ row }) => formatDateTime(row.original.updatedAt) },
  ];
  return <PermissionGate permission={permissions.catalogRead}>
    <PageHeader title="สินค้า" description="ค้นหาและจัดการสินค้า SKU หมวดหมู่ รูปภาพ และราคา" actions={writable ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> เพิ่มสินค้า</Button></DialogTrigger><DialogContent><DialogTitle>สร้างสินค้า</DialogTitle><DialogDescription>ระบบจะสร้างเลข PRD ให้อัตโนมัติ</DialogDescription><div className="mt-5 grid gap-4"><Input placeholder="ชื่อสินค้า" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></Select><Textarea placeholder="รายละเอียด" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><Button onClick={() => create.mutate()}>สร้างสินค้า</Button></div></DialogContent></Dialog> : undefined} />
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_220px]"><Input placeholder="ค้นหาเลขหรือชื่อสินค้า" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} /><Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}><option value="">ทุกสถานะ</option><option>DRAFT</option><option>ACTIVE</option><option>INACTIVE</option></Select><Select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value, page: 1 })}><option value="">ทุกหมวดหมู่</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div>
    {products.isLoading ? <LoadingState /> : <DataTable data={products.data?.data ?? []} columns={columns} />}
    <Pagination pagination={products.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
  </PermissionGate>;
}
