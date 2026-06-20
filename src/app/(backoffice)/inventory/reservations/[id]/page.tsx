"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { Reservation } from "@/types/api";

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const writable = can(user, permissions.inventoryWrite);
  const queryClient = useQueryClient();
  const reservation = useQuery({ queryKey: ["reservations", id], queryFn: () => apiFetch<Reservation>(`inventory/reservations/${id}`) });
  const transition = useMutation({
    mutationFn: (action: "confirm" | "release") => apiFetch<Reservation>(`inventory/reservations/${id}/${action}`, { method: "POST" }),
    onSuccess: (value) => { toast.success(`สถานะเป็น ${value.status}`); queryClient.invalidateQueries({ queryKey: ["reservations"] }); queryClient.invalidateQueries({ queryKey: ["inventory"] }); },
    onError: (error) => toast.error(error.message),
  });
  if (reservation.isLoading || !reservation.data) return <LoadingState />;
  const item = reservation.data;
  return <PermissionGate permission={permissions.inventoryRead}>
    <PageHeader title={`${item.referenceType} · ${item.referenceId}`} description={`สร้างเมื่อ ${formatDateTime(item.createdAt)}`} actions={<Badge value={item.status} />} />
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <Card><CardContent className="space-y-4 p-6"><Info label="Warehouse ID" value={item.warehouseId} /><Info label="หมดอายุ" value={formatDateTime(item.expiresAt)} /><Info label="ยืนยันเมื่อ" value={formatDateTime(item.confirmedAt)} /><Info label="ปล่อยเมื่อ" value={formatDateTime(item.releasedAt)} />{writable && item.status === "PENDING" && <div className="flex gap-3"><Button onClick={() => transition.mutate("confirm")}>Confirm</Button><Button variant="outline" onClick={() => transition.mutate("release")}>Release</Button></div>}</CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="font-bold">รายการ SKU</h2><div className="mt-4 divide-y">{item.items.map((reservationItem) => <div key={reservationItem.skuId} className="flex justify-between py-3 text-sm"><span className="font-mono text-slate-600">{reservationItem.skuId}</span><strong>{reservationItem.quantity}</strong></div>)}</div></CardContent></Card>
    </div>
  </PermissionGate>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 break-all font-semibold">{value}</p></div>; }
