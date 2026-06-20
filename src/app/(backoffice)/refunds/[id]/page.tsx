"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Refund } from "@/types/api";

export default function RefundPage() {
  const { id } = useParams<{ id: string }>();
  const refund = useQuery({ queryKey: ["refunds", id], queryFn: () => apiFetch<Refund>(`refunds/${id}`), refetchInterval: 5000 });
  if (!refund.data) return <LoadingState />;
  return <PermissionGate permission={permissions.refundsRead}>
    <PageHeader title={refund.data.refundNumber} description={`สร้างเมื่อ ${formatDateTime(refund.data.createdAt)}`} actions={<Badge value={refund.data.status} />} />
    <Card><CardContent className="space-y-4 p-6"><div><small className="text-slate-500">ยอดคืนเงิน</small><p className="text-2xl font-bold">{formatCurrency(refund.data.amount, refund.data.currency)}</p></div><div><small className="text-slate-500">เหตุผล</small><p>{refund.data.reason}</p></div><div><small className="text-slate-500">Stripe Refund ID</small><p>{refund.data.providerRefundId ?? "-"}</p></div></CardContent></Card>
  </PermissionGate>;
}
