"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { Role, UserSummary } from "@/types/api";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useQuery({
    queryKey: ["users", id],
    queryFn: () => apiFetch<UserSummary>(`users/${id}`),
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => apiFetch<Role[]>("roles"),
  });
  if (user.isLoading) return <LoadingState />;
  if (!user.data) return <LoadingState text="ไม่พบผู้ใช้งาน" />;
  return (
    <PermissionGate adminOnly>
      <PageHeader title="แก้ไขผู้ใช้งาน" description={user.data?.email} />
      <UserEditor user={user.data} roles={roles.data ?? []} />
    </PermissionGate>
  );
}

function UserEditor({ user, roles }: { user: UserSummary; roles: Role[] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    isActive: user.isActive,
    roleCodes: user.roles,
  });
  const save = useMutation({
    mutationFn: () =>
      apiFetch<UserSummary>(`users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          isActive: form.isActive,
          roleCodes: form.roleCodes,
          ...(form.password ? { password: form.password } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("บันทึกข้อมูลแล้ว");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card className="max-w-3xl">
      <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <Input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="ชื่อ" />
          <Input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="นามสกุล" />
          <Input className="sm:col-span-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="อีเมล" />
          <Input className="sm:col-span-2" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            เปิดใช้งานบัญชี
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">บทบาท</p>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
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
          </div>
          <Button className="sm:col-span-2" onClick={() => save.mutate()} disabled={save.isPending}>
            บันทึกการเปลี่ยนแปลง
          </Button>
      </CardContent>
    </Card>
  );
}
