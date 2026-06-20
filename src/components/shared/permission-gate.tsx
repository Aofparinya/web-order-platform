"use client";

import { useSession } from "@/components/providers";
import { Card, CardContent } from "@/components/ui/card";
import { can, isAdmin } from "@/lib/permissions";

export function PermissionGate({
  permission,
  adminOnly = false,
  children,
}: {
  permission?: string;
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  const { user, loading } = useSession();
  if (loading) return null;
  const allowed = adminOnly ? isAdmin(user) : permission ? can(user, permission) : true;
  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <h2 className="text-lg font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="mt-2 text-sm text-slate-500">
            บัญชีนี้ไม่ได้รับ permission สำหรับหน้าดังกล่าว
          </p>
        </CardContent>
      </Card>
    );
  }
  return children;
}
