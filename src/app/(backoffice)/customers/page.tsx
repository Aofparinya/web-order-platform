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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatDateTime } from "@/lib/utils";
import type { Customer, Page } from "@/types/api";

export default function CustomersPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    q: "",
    customerType: "",
    status: "",
    page: 1,
    pageSize: 20,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customerType: "INDIVIDUAL",
    status: "ACTIVE",
    firstName: "",
    lastName: "",
    companyName: "",
    registrationNumber: "",
    note: "",
  });
  const query = useQuery({
    queryKey: ["customers", filters],
    queryFn: () =>
      apiFetch<Page<Customer>>(`customers${toQueryString(filters)}`),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch<Customer>("customers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          firstName: form.customerType === "INDIVIDUAL" ? form.firstName : undefined,
          lastName: form.customerType === "INDIVIDUAL" ? form.lastName : undefined,
          companyName: form.customerType === "CORPORATE" ? form.companyName : undefined,
          registrationNumber: form.registrationNumber || undefined,
          note: form.note || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("เพิ่มลูกค้าแล้ว");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const columns: ColumnDef<Customer>[] = [
    {
      header: "รหัสลูกค้า",
      cell: ({ row }) => (
        <Link className="font-semibold text-blue-700" href={`/customers/${row.original.id}`}>
          {row.original.customerNo}
        </Link>
      ),
    },
    {
      header: "ชื่อ",
      cell: ({ row }) =>
        row.original.companyName ??
        `${row.original.firstName ?? ""} ${row.original.lastName ?? ""}`,
    },
    { header: "ประเภท", accessorKey: "customerType" },
    { header: "สถานะ", cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "สร้างเมื่อ", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  ];
  return (
    <PermissionGate permission={permissions.customersRead}>
      <PageHeader
        title="ลูกค้า"
        description="ค้นหาและจัดการข้อมูลลูกค้าบุคคลหรือบริษัท"
        actions={
          can(user, permissions.customersWrite) ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus /> เพิ่มลูกค้า</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>เพิ่มลูกค้า</DialogTitle>
                <DialogDescription>กรอกข้อมูลหลักก่อนเพิ่มข้อมูลย่อยในหน้ารายละเอียด</DialogDescription>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Select value={form.customerType} onChange={(event) => setForm({ ...form, customerType: event.target.value })}>
                    <option value="INDIVIDUAL">บุคคล</option>
                    <option value="CORPORATE">บริษัท</option>
                  </Select>
                  <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </Select>
                  {form.customerType === "INDIVIDUAL" ? (
                    <>
                      <Input placeholder="ชื่อ" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                      <Input placeholder="นามสกุล" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
                    </>
                  ) : (
                    <Input className="sm:col-span-2" placeholder="ชื่อบริษัท" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
                  )}
                  <Input className="sm:col-span-2" placeholder="เลขทะเบียนบริษัท (ถ้ามี)" value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} />
                  <Textarea className="sm:col-span-2" placeholder="หมายเหตุ" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
                  <Button className="sm:col-span-2" onClick={() => create.mutate()} disabled={create.isPending}>บันทึกลูกค้า</Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <Input placeholder="ค้นหารหัส ชื่อ หรือเลขทะเบียน" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} />
        <Select value={filters.customerType} onChange={(event) => setFilters({ ...filters, customerType: event.target.value, page: 1 })}>
          <option value="">ทุกประเภท</option>
          <option value="INDIVIDUAL">บุคคล</option>
          <option value="CORPORATE">บริษัท</option>
        </Select>
        <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
          <option value="">ทุกสถานะ</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="BLOCKED">BLOCKED</option>
        </Select>
      </div>
      {query.isLoading ? <LoadingState /> : <DataTable data={query.data?.data ?? []} columns={columns} />}
      <Pagination pagination={query.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
    </PermissionGate>
  );
}
