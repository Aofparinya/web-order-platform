"use client";

import { useSession } from "@/components/providers";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, loading } = useSession();
  if (loading || !user) return <LoadingState />;
  return (
    <>
      <PageHeader title="ข้อมูลบัญชี" description="ข้อมูลผู้ใช้งานและสิทธิ์ปัจจุบัน" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <Info label="ชื่อ" value={`${user.firstName} ${user.lastName}`} />
            <Info label="อีเมล" value={user.email} />
            <Info label="สถานะ" value={user.isActive ? "ACTIVE" : "INACTIVE"} />
            <div>
              <p className="mb-2 text-sm text-slate-500">บทบาท</p>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => <Badge key={role} value={role} />)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bold">Permissions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.permissions.length ? (
                user.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  >
                    {permission}
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">ไม่มี permission เพิ่มเติม</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
