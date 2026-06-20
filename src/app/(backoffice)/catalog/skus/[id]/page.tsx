"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { Price, Sku } from "@/types/api";

export default function SkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const sku = useQuery({ queryKey: ["skus", id], queryFn: () => apiFetch<Sku>(`skus/${id}`) });
  const prices = useQuery({ queryKey: ["skus", id, "prices"], queryFn: () => apiFetch<Price[]>(`skus/${id}/prices`) });
  const [price, setPrice] = useState({ amount: 0, currency: "THB", validFrom: new Date().toISOString().slice(0, 16), validTo: "" });
  const addPrice = useMutation({ mutationFn: () => apiFetch<Price>(`skus/${id}/prices`, { method: "POST", body: JSON.stringify({ amount: price.amount, currency: price.currency, validFrom: new Date(price.validFrom).toISOString(), validTo: price.validTo ? new Date(price.validTo).toISOString() : undefined }) }), onSuccess: () => { toast.success("เพิ่มราคาแล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", id, "prices"] }); }, onError: (error) => toast.error(error.message) });
  async function removePrice(priceId: string) { if (!confirm("ยืนยันการลบราคา?")) return; try { await apiFetch<void>(`skus/${id}/prices/${priceId}`, { method: "DELETE" }); toast.success("ลบราคาแล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", id, "prices"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ"); } }
  if (sku.isLoading) return <LoadingState />;
  return <PermissionGate permission={permissions.catalogRead}>
    <PageHeader title={sku.data?.name ?? "SKU"} description={sku.data?.code} actions={sku.data ? <Badge value={sku.data.status} /> : undefined} />
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      {sku.data && <SkuOverview sku={sku.data} writable={writable} />}
      <div className="space-y-4">
        {writable && <Card><CardContent className="grid gap-3 p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 font-bold">เพิ่มราคา</h2><Input type="number" step="0.01" value={price.amount} onChange={(event) => setPrice({ ...price, amount: Number(event.target.value) })} /><Input maxLength={3} value={price.currency} onChange={(event) => setPrice({ ...price, currency: event.target.value.toUpperCase() })} /><Input type="datetime-local" value={price.validFrom} onChange={(event) => setPrice({ ...price, validFrom: event.target.value })} /><Input type="datetime-local" value={price.validTo} onChange={(event) => setPrice({ ...price, validTo: event.target.value })} /><Button className="sm:col-span-2" onClick={() => addPrice.mutate()}><Plus /> เพิ่มราคา</Button></CardContent></Card>}
        <div className="space-y-3">{prices.data?.map((item) => <Card key={item.id}><CardContent className="flex items-start justify-between p-4"><div><strong>{Number(item.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} {item.currency}</strong><p className="text-sm text-slate-500">{formatDateTime(item.validFrom)} → {item.validTo ? formatDateTime(item.validTo) : "ไม่มีกำหนด"}</p></div>{writable && <Button variant="ghost" size="icon" onClick={() => removePrice(item.id)}><Trash2 className="size-4 text-red-600" /></Button>}</CardContent></Card>)}</div>
      </div>
    </div>
  </PermissionGate>;
}

function SkuOverview({ sku, writable }: { sku: Sku; writable: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: sku.code, barcode: sku.barcode ?? "", name: sku.name, status: sku.status, attributes: JSON.stringify(sku.attributes, null, 2) });
  const update = useMutation({ mutationFn: () => apiFetch<Sku>(`skus/${sku.id}`, { method: "PATCH", body: JSON.stringify({ ...form, barcode: form.barcode || undefined, attributes: JSON.parse(form.attributes) as Record<string, unknown> }) }), onSuccess: () => { toast.success("บันทึก SKU แล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", sku.id] }); }, onError: (error) => toast.error(error.message) });
  return <Card><CardContent className="grid gap-4 p-6"><h2 className="font-bold">ข้อมูล SKU</h2><Input disabled={!writable} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><Input disabled={!writable} value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Barcode" /><Input disabled={!writable} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Select disabled={!writable} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Sku["status"] })}><option>ACTIVE</option><option>INACTIVE</option></Select><Textarea disabled={!writable} className="min-h-44 font-mono" value={form.attributes} onChange={(event) => setForm({ ...form, attributes: event.target.value })} />{writable && <Button onClick={() => update.mutate()}>บันทึก SKU</Button>}</CardContent></Card>;
}
