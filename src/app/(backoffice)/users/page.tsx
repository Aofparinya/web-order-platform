"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
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
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import type { Role, UserSummary } from "@/types/api";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roleCodes: ["USER"],
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserSummary[]>("users"),
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("roles"),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch<UserSummary>("users", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("สร้างผู้ใช้งานแล้ว");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const data = useMemo(() => {
    const keyword = search.toLowerCase();
    return (users.data ?? []).filter((user) =>
      `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [users.data, search]);
  const columns: ColumnDef<UserSummary>[] = [
    {
      header: "ผู้ใช้งาน",
      cell: ({ row }) => (
        <Link className="font-semibold text-blue-700" href={`/users/${row.original.id}`}>
          {row.original.firstName} {row.original.lastName}
          <span className="block text-xs font-normal text-slate-500">
            {row.original.email}
          </span>
        </Link>
      ),
    },
    {
      header: "บทบาท",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.roles.map((role) => <Badge key={role} value={role} />)}
        </div>
      ),
    },
    {
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge value={row.original.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: "สร้างเมื่อ",
      accessorFn: (row) => formatDateTime(row.createdAt),
    },
  ];
  return (
    <PermissionGate adminOnly>
      <PageHeader
        title="ผู้ใช้งาน"
        description="สร้างบัญชี เปิด/ปิดการใช้งาน และกำหนดบทบาท"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus /> เพิ่มผู้ใช้งาน</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>เพิ่มผู้ใช้งาน</DialogTitle>
              <DialogDescription>กำหนดข้อมูลเข้าสู่ระบบและบทบาทเริ่มต้น</DialogDescription>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input placeholder="ชื่อ" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                <Input placeholder="นามสกุล" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
                <Input className="sm:col-span-2" type="email" placeholder="อีเมล" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                <Input className="sm:col-span-2" type="password" placeholder="รหัสผ่านอย่างน้อย 8 ตัว" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {roles.data?.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.roleCodes.includes(role.code)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            roleCodes: event.target.checked
                              ? [...form.roleCodes, role.code]
                              : form.roleCodes.filter((code) => code !== role.code),
                          })
                        }
                      />
                      {role.code}
                    </label>
                  ))}
                </div>
                <Button className="sm:col-span-2" onClick={() => create.mutate()} disabled={create.isPending}>
                  บันทึกผู้ใช้งาน
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <Input className="mb-4 max-w-md" placeholder="ค้นหาชื่อหรืออีเมล" value={search} onChange={(event) => setSearch(event.target.value)} />
      {users.isLoading ? <LoadingState /> : <DataTable data={data} columns={columns} />}
    </PermissionGate>
  );
}
