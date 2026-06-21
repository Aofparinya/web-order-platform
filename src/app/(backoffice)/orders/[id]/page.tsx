"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, OrderHistory, OrderPayment, Refund } from "@/types/api";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const writable = can(user, permissions.ordersWrite);
  const paymentsWritable = can(user, permissions.paymentsWrite);
  const refundsWritable = can(user, permissions.refundsWrite);
  const order = useQuery({ queryKey: ["orders", id], queryFn: () => apiFetch<Order>(`orders/${id}`), refetchInterval: 5000 });
  const history = useQuery({ queryKey: ["orders", id, "history"], queryFn: () => apiFetch<OrderHistory[]>(`orders/${id}/history`) });
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: "" });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["orders", id] });
    queryClient.invalidateQueries({ queryKey: ["orders", id, "history"] });
  };
  const action = useMutation({
    mutationFn: ({ path, body = {} }: { path: string; body?: unknown }) => apiFetch<unknown>(path, {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    }),
    onSuccess: () => { toast.success("ส่งคำสั่งดำเนินการแล้ว"); refresh(); },
    onError: (error) => toast.error(error.message),
  });
  if (order.isLoading || !order.data) return <LoadingState />;
  const value = order.data;
  const activePayment = value.payments.at(-1);
  const runOrderAction = (name: string) => action.mutate({ path: `orders/${id}/${name}`, body: { version: value.version } });
  const createPayment = () => action.mutate({ path: `orders/${id}/payments` });
  const paymentAction = (name: string) => activePayment && action.mutate({ path: `payments/${activePayment.id}/${name}` });
  const refund = () => activePayment && action.mutate({ path: `payments/${activePayment.id}/refunds`, body: refundForm });
  return (
    <PermissionGate permission={permissions.ordersRead}>
      <PageHeader
        title={value.orderNumber}
        description={`สร้างเมื่อ ${formatDateTime(value.createdAt)} · Version ${value.version}`}
        actions={<>
          <Badge value={value.status} />
          {writable && value.status === "DRAFT" && <Button onClick={() => runOrderAction("submit")}>Submit และจอง Stock</Button>}
          {writable && ["DRAFT", "PENDING_PAYMENT"].includes(value.status) && <Button variant="outline" onClick={() => runOrderAction("cancel")}>ยกเลิก</Button>}
          {paymentsWritable && value.status === "PENDING_PAYMENT" && !activePayment && <Button onClick={createPayment}>สร้าง Stripe Checkout</Button>}
          {activePayment?.checkoutUrl && ["CHECKOUT_OPEN", "AUTHORIZED"].includes(activePayment.status) && <Button asChild variant="outline"><Link href={`/payments/${activePayment.id}`}><ExternalLink /> ดูการชำระเงิน</Link></Button>}
          {paymentsWritable && activePayment?.status === "AUTHORIZED" && <Button onClick={() => paymentAction("capture")}>Capture Payment</Button>}
          {paymentsWritable && ["AUTHORIZED", "CHECKOUT_OPEN"].includes(activePayment?.status ?? "") && <Button variant="outline" onClick={() => paymentAction("void")}>Void</Button>}
          {writable && value.status === "PAID" && <Button onClick={() => runOrderAction("process")}>เริ่มดำเนินการ</Button>}
          {writable && value.status === "PROCESSING" && <Button onClick={() => runOrderAction("complete")}>เสร็จสมบูรณ์</Button>}
        </>}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Subtotal" value={value.subtotal} currency={value.currency} />
        <Metric label="Discount" value={value.discountAmount} currency={value.currency} />
        <Metric label="VAT 7%" value={value.taxAmount} currency={value.currency} />
        <Metric label="Total" value={value.totalAmount} currency={value.currency} />
        <Metric label="Refunded" value={value.refundedAmount} currency={value.currency} />
      </div>
      <Tabs.Root defaultValue="items">
        <Tabs.List className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
          {["items:รายการสินค้า", "payments:การชำระเงิน", "invoice:Invoice", "refunds:Refund", "history:Timeline"].map((item) => {
            const [tab, label] = item.split(":");
            return <Tabs.Trigger key={tab} value={tab} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white">{label}</Tabs.Trigger>;
          })}
        </Tabs.List>
        <Tabs.Content value="items"><Card><CardContent className="divide-y p-0">{value.items.map((item) => <div key={item.id} className="flex justify-between gap-4 p-5"><div><strong>{item.skuCode} · {item.skuName}</strong><p className="text-sm text-slate-500">{item.productName}</p></div><div className="text-right"><strong>{formatCurrency(item.lineTotal, value.currency)}</strong><p className="text-sm text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice, value.currency)}</p></div></div>)}</CardContent></Card></Tabs.Content>
        <Tabs.Content value="payments"><div className="grid gap-3">{value.payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)}{!value.payments.length && <Empty text="ยังไม่มี Payment" />}</div></Tabs.Content>
        <Tabs.Content value="invoice">{value.invoice ? <Card><CardContent className="flex items-center justify-between p-6"><div><strong>{value.invoice.invoiceNumber}</strong><p className="text-sm text-slate-500">ออกเมื่อ {formatDateTime(value.invoice.issuedAt)}</p></div><Button asChild><Link href={`/invoices/${value.invoice.id}`}><ReceiptText /> เปิด Invoice</Link></Button></CardContent></Card> : <Empty text="Invoice จะถูกสร้างหลัง Capture สำเร็จ" />}</Tabs.Content>
        <Tabs.Content value="refunds">
          {refundsWritable && activePayment?.status === "CAPTURED" && <Card className="mb-4"><CardContent className="grid gap-3 p-5 sm:grid-cols-2"><Input type="number" min={0.01} placeholder="ยอด Refund" value={refundForm.amount || ""} onChange={(event) => setRefundForm({ ...refundForm, amount: Number(event.target.value) })} /><Textarea placeholder="เหตุผล" value={refundForm.reason} onChange={(event) => setRefundForm({ ...refundForm, reason: event.target.value })} /><Button className="sm:col-span-2" onClick={refund}>สร้าง Refund</Button></CardContent></Card>}
          <RefundList payments={value.payments} />
        </Tabs.Content>
        <Tabs.Content value="history"><div className="space-y-3">{history.data?.map((item) => <Card key={item.id}><CardContent className="p-5"><div className="flex items-center justify-between"><Badge value={item.toStatus} /><small className="text-slate-500">{formatDateTime(item.createdAt)}</small></div><p className="mt-2 text-sm">{item.reason}</p></CardContent></Card>)}</div></Tabs.Content>
      </Tabs.Root>
    </PermissionGate>
  );
}

function Metric({ label, value, currency }: { label: string; value: number; currency: string }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-1 block text-xl">{formatCurrency(value, currency)}</strong></CardContent></Card>;
}

function PaymentCard({ payment }: { payment: OrderPayment }) {
  return <Card><CardContent className="flex items-center justify-between p-5"><div><Link href={`/payments/${payment.id}`} className="font-semibold text-blue-700">{payment.paymentNumber}</Link><p className="text-sm text-slate-500">{formatDateTime(payment.createdAt)}</p></div><div className="text-right"><Badge value={payment.status} /><p className="mt-2 text-sm">{formatCurrency(payment.amount, payment.currency)}</p></div></CardContent></Card>;
}

function RefundList({ payments }: { payments: OrderPayment[] }) {
  const ids = payments.map((payment) => payment.id);
  const query = useQuery({
    queryKey: ["refunds", ids],
    enabled: ids.length > 0,
    queryFn: async () => (await Promise.all(ids.map((id) => apiFetch<Refund[]>(`payments/${id}/refunds`)))).flat(),
  });
  if (!query.data?.length) return <Empty text="ยังไม่มี Refund" />;
  return <div className="grid gap-3">{query.data.map((refund) => <Card key={refund.id}><CardContent className="flex justify-between p-5"><Link href={`/refunds/${refund.id}`} className="font-semibold text-blue-700">{refund.refundNumber}</Link><div className="text-right"><Badge value={refund.status} /><p>{formatCurrency(refund.amount, refund.currency)}</p></div></CardContent></Card>)}</div>;
}

function Empty({ text }: { text: string }) {
  return <Card><CardContent className="py-12 text-center text-sm text-slate-500">{text}</CardContent></Card>;
}
