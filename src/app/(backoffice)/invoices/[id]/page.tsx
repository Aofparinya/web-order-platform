"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Invoice } from "@/types/api";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const invoice = useQuery({ queryKey: ["invoices", id], queryFn: () => apiFetch<Invoice>(`invoices/${id}`) });
  if (!invoice.data) return <LoadingState />;
  return <PermissionGate permission={permissions.invoicesRead}>
    <PageHeader title={invoice.data.invoiceNumber} description={`ออกเมื่อ ${formatDateTime(invoice.data.issuedAt)}`} actions={<Button asChild><Link href={`/invoices/${id}/print`}><Printer /> พิมพ์ Invoice</Link></Button>} />
    <InvoiceDocument invoice={invoice.data} />
  </PermissionGate>;
}

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const customer = parseJson(invoice.customerSnapshotJson);
  const billing = parseJson(invoice.billingAddressSnapshotJson);
  const tax = parseJson(invoice.taxProfileSnapshotJson);
  return <Card><CardContent className="space-y-6 p-8">
    <div className="flex justify-between gap-6"><div><h2 className="text-xl font-bold">Order Platform</h2><p className="text-sm text-slate-500">Tax Invoice / Receipt</p></div><div className="text-right"><strong>{invoice.invoiceNumber}</strong><p className="text-sm text-slate-500">{formatDateTime(invoice.issuedAt)}</p></div></div>
    <div className="grid gap-5 border-y py-5 md:grid-cols-2"><div><small className="text-slate-500">ลูกค้า</small><pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{formatSnapshot(customer)}</pre></div><div><small className="text-slate-500">ที่อยู่ออกเอกสาร</small><pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{formatSnapshot(billing)}</pre>{tax && <p className="mt-2 text-sm">Tax ID: {String(tax.taxId ?? "-")}</p>}</div></div>
    <div className="ml-auto grid max-w-sm gap-2 text-sm"><Total label="Subtotal" value={invoice.subtotal} invoice={invoice} /><Total label="Discount" value={invoice.discountAmount} invoice={invoice} /><Total label="Net" value={invoice.netAmount} invoice={invoice} /><Total label="VAT 7%" value={invoice.taxAmount} invoice={invoice} /><Total label="Total" value={invoice.totalAmount} invoice={invoice} strong /></div>
  </CardContent></Card>;
}

function Total({ label, value, invoice, strong = false }: { label: string; value: number; invoice: Invoice; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "border-t pt-2 text-base font-bold" : ""}`}><span>{label}</span><span>{formatCurrency(value, invoice.currency)}</span></div>;
}
function parseJson(value?: string): Record<string, unknown> | null { try { return value ? JSON.parse(value) as Record<string, unknown> : null; } catch { return null; } }
function formatSnapshot(value: Record<string, unknown> | null) { return value ? Object.entries(value).filter(([, item]) => typeof item !== "object" && item).map(([key, item]) => `${key}: ${String(item)}`).join("\n") : "-"; }
