"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import type { Warehouse } from "@/types/api";

export default function WarehousesPage() {
  const { user } = useSession();
  const writable = can(user, permissions.inventoryWrite);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", status: "ACTIVE" });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const create = useMutation({
    mutationFn: () => apiFetch<Warehouse>("warehouses", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { toast.success("เพิ่มคลังสินค้าแล้ว"); setForm({ code: "", name: "", status: "ACTIVE" }); queryClient.invalidateQueries({ queryKey: ["warehouses"] }); },
    onError: (error) => toast.error(error.message),
  });
  async function remove(id: string) { if (!confirm("ยืนยันการลบคลังสินค้า? คลังที่มีสต็อกจะลบไม่ได้")) return; try { await apiFetch<void>(`warehouses/${id}`, { method: "DELETE" }); toast.success("ลบคลังแล้ว"); queryClient.invalidateQueries({ queryKey: ["warehouses"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ"); } }
  const columns: ColumnDef<Warehouse>[] = [
    { header: "รหัสคลัง", accessorKey: "code" },
    { header: "ชื่อคลัง", accessorKey: "name" },
    { header: "สถานะ", cell: ({ row }) => <Badge value={row.original.status} /> },
    { id: "actions", header: "", cell: ({ row }) => writable ? <Button variant="ghost" size="icon" onClick={() => remove(row.original.id)}><Trash2 className="size-4 text-red-600" /></Button> : null },
  ];
  return <PermissionGate permission={permissions.inventoryRead}>
    <PageHeader title="คลังสินค้า" description="กำหนดรหัสคลังและสถานะการใช้งาน" />
    {writable && <Card className="mb-5"><CardContent className="grid gap-3 p-5 md:grid-cols-[180px_1fr_180px_auto]"><Input placeholder="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><Input placeholder="ชื่อคลังสินค้า" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>ACTIVE</option><option>INACTIVE</option></Select><Button onClick={() => create.mutate()}><Plus /> เพิ่มคลัง</Button></CardContent></Card>}
    {warehouses.isLoading ? <LoadingState /> : <DataTable data={warehouses.data ?? []} columns={columns} />}
  </PermissionGate>;
}
