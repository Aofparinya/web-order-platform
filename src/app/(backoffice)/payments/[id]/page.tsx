"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { OrderPayment, Refund } from "@/types/api";

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const payment = useQuery({ queryKey: ["payments", id], queryFn: () => apiFetch<OrderPayment>(`payments/${id}`), refetchInterval: 5000 });
  const refunds = useQuery({ queryKey: ["payments", id, "refunds"], queryFn: () => apiFetch<Refund[]>(`payments/${id}/refunds`) });
  if (!payment.data) return <LoadingState />;
  return <PermissionGate permission={permissions.paymentsRead}>
    <PageHeader title={payment.data.paymentNumber} description={`สร้างเมื่อ ${formatDateTime(payment.data.createdAt)}`} actions={<Badge value={payment.data.status} />} />
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardContent className="space-y-3 p-6">
        <Row label="ยอดชำระ" value={formatCurrency(payment.data.amount, payment.data.currency)} />
        <Row label="PaymentIntent" value={payment.data.providerPaymentIntentId ?? "-"} />
        <Row label="Checkout หมดอายุ" value={formatDateTime(payment.data.checkoutExpiresAt)} />
        {payment.data.checkoutUrl && <Button asChild><a href={payment.data.checkoutUrl} target="_blank" rel="noreferrer">เปิด Stripe Checkout</a></Button>}
      </CardContent></Card>
      <Card><CardContent className="p-6"><h2 className="mb-4 font-bold">Refunds</h2><div className="space-y-3">{refunds.data?.map((refund) => <Link key={refund.id} href={`/refunds/${refund.id}`} className="flex justify-between rounded-lg border p-3"><span>{refund.refundNumber}</span><span>{formatCurrency(refund.amount, refund.currency)}</span></Link>)}{!refunds.data?.length && <p className="text-sm text-slate-500">ยังไม่มี Refund</p>}</div></CardContent></Card>
    </div>
  </PermissionGate>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><small className="text-slate-500">{label}</small><p className="break-all font-semibold">{value}</p></div>;
}
