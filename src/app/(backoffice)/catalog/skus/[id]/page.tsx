"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, PackageOpen, Plus, Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import type { Price, Product, Sku } from "@/types/api";

export default function SkuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const sku = useQuery({ queryKey: ["skus", id], queryFn: () => apiFetch<Sku>(`skus/${id}`) });
  const product = useQuery({ queryKey: ["products", sku.data?.productId], enabled: Boolean(sku.data?.productId), queryFn: () => apiFetch<Product>(`products/${sku.data!.productId}`) });
  const prices = useQuery({ queryKey: ["skus", id, "prices"], queryFn: () => apiFetch<Price[]>(`skus/${id}/prices`) });
  const [price, setPrice] = useState({ amount: 0, currency: "THB", validFrom: new Date().toISOString().slice(0, 16), validTo: "" });
  const addPrice = useMutation({ mutationFn: () => apiFetch<Price>(`skus/${id}/prices`, { method: "POST", body: JSON.stringify({ amount: price.amount, currency: price.currency, validFrom: new Date(price.validFrom).toISOString(), validTo: price.validTo ? new Date(price.validTo).toISOString() : undefined }) }), onSuccess: () => { toast.success("เพิ่มราคาแล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", id, "prices"] }); }, onError: (error) => toast.error(error.message) });
  async function removePrice(priceId: string) { if (!confirm("ยืนยันการลบราคา?")) return; try { await apiFetch<void>(`skus/${id}/prices/${priceId}`, { method: "DELETE" }); toast.success("ลบราคาแล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", id, "prices"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ"); } }
  if (sku.isLoading) return <LoadingState />;
  return <PermissionGate permission={permissions.catalogRead}>
    <Link href={sku.data ? `/catalog/products/${sku.data.productId}?tab=skus` : "/catalog/products"} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"><ArrowLeft className="size-4" /> กลับไปหน้าสินค้า</Link>
    <PageHeader title={sku.data?.name ?? "SKU"} description={`${product.data?.name ?? "สินค้า"} · ${sku.data?.code ?? ""}`} actions={sku.data ? <Badge value={sku.data.status} /> : undefined} />
    <Card className="mb-5 border-blue-200 bg-blue-50 shadow-none"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-blue-950">ขั้นตอนนี้: ตรวจข้อมูล SKU และกำหนดราคาขาย</strong><p className="mt-1 text-sm text-blue-800">เมื่อมีราคาแล้ว ให้ไปเพิ่มจำนวนสินค้าในคลังเพื่อเริ่มขาย</p></div><Button asChild size="sm"><Link href={`/inventory/stock?skuId=${id}`}>ไปปรับสต็อก <ChevronRight className="size-4" /></Link></Button></CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      {sku.data && <SkuOverview key={sku.data.id} sku={sku.data} writable={writable} />}
      <div className="space-y-4">
        {writable && <Card><CardContent className="p-5"><div><h2 className="font-bold text-slate-950">กำหนดราคาขาย</h2><p className="mt-1 text-sm text-slate-500">ราคาที่มีช่วงเวลาซ้อนกันในสกุลเงินเดียวกันจะไม่สามารถบันทึกได้</p></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><SkuField label="ราคาขาย"><Input type="number" min={0} step="0.01" placeholder="0.00" value={price.amount} onChange={(event) => setPrice({ ...price, amount: Number(event.target.value) })} /></SkuField><SkuField label="สกุลเงิน" hint="รหัส ISO 3 ตัว"><Input maxLength={3} value={price.currency} onChange={(event) => setPrice({ ...price, currency: event.target.value.toUpperCase() })} /></SkuField><SkuField label="เริ่มใช้ราคา"><Input type="datetime-local" value={price.validFrom} onChange={(event) => setPrice({ ...price, validFrom: event.target.value })} /></SkuField><SkuField label="สิ้นสุดราคา" hint="เว้นว่างหากใช้ต่อเนื่อง"><Input type="datetime-local" value={price.validTo} onChange={(event) => setPrice({ ...price, validTo: event.target.value })} /></SkuField><Button className="sm:col-span-2" disabled={price.amount <= 0 || !price.validFrom || addPrice.isPending} onClick={() => addPrice.mutate()}><Plus /> {addPrice.isPending ? "กำลังบันทึก..." : "เพิ่มราคาขาย"}</Button></div></CardContent></Card>}
        {!prices.isLoading && !prices.data?.length && <Card className="border-dashed shadow-none"><CardContent className="flex flex-col items-center px-5 py-10 text-center"><span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><PackageOpen className="size-6" /></span><h3 className="mt-3 font-bold">ยังไม่มีราคาขาย</h3><p className="mt-1 text-sm text-slate-500">กรอกราคาด้านบนเพื่อให้ SKU นี้พร้อมแสดงในหน้าร้าน</p></CardContent></Card>}
        <div className="space-y-3">{prices.data?.map((item) => <Card key={item.id}><CardContent className="flex items-start justify-between p-4"><div><strong>{Number(item.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} {item.currency}</strong><p className="text-sm text-slate-500">{formatDateTime(item.validFrom)} → {item.validTo ? formatDateTime(item.validTo) : "ไม่มีกำหนด"}</p></div>{writable && <Button variant="ghost" size="icon" onClick={() => removePrice(item.id)}><Trash2 className="size-4 text-red-600" /></Button>}</CardContent></Card>)}</div>
      </div>
    </div>
  </PermissionGate>;
}

function SkuOverview({ sku, writable }: { sku: Sku; writable: boolean }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ code: sku.code, barcode: sku.barcode ?? "", name: sku.name, status: sku.status, attributes: JSON.stringify(sku.attributes, null, 2) });
  const update = useMutation({ mutationFn: () => apiFetch<Sku>(`skus/${sku.id}`, { method: "PATCH", body: JSON.stringify({ ...form, barcode: form.barcode || undefined, attributes: JSON.parse(form.attributes) as Record<string, unknown> }) }), onSuccess: () => { toast.success("บันทึก SKU แล้ว"); queryClient.invalidateQueries({ queryKey: ["skus", sku.id] }); }, onError: (error) => toast.error(error.message) });
  return <Card><CardContent className="p-6"><div><h2 className="font-bold text-slate-950">ข้อมูล SKU</h2><p className="mt-1 text-sm text-slate-500">SKU คือหน่วยสินค้าที่กำหนดราคาและนับสต็อกจริง</p></div><div className="mt-4 grid gap-4"><SkuField label="รหัส SKU"><Input disabled={!writable} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></SkuField><SkuField label="บาร์โค้ด" hint="ไม่บังคับ"><Input disabled={!writable} value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="8851234567890" /></SkuField><SkuField label="ชื่อ SKU"><Input disabled={!writable} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></SkuField><SkuField label="สถานะ"><Select disabled={!writable} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Sku["status"] })}><option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option><option value="INACTIVE">หยุดใช้งาน (INACTIVE)</option></Select></SkuField><SkuField label="คุณลักษณะสินค้า" hint='รูปแบบ JSON เช่น {"color":"black","size":"XL"}'><Textarea disabled={!writable} className="min-h-44 font-mono" value={form.attributes} onChange={(event) => setForm({ ...form, attributes: event.target.value })} /></SkuField>{writable && <Button disabled={!form.code.trim() || !form.name.trim() || update.isPending} onClick={() => update.mutate()}>{update.isPending ? "กำลังบันทึก..." : "บันทึกข้อมูล SKU"}</Button>}</div></CardContent></Card>;
}

function SkuField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}</label>;
}
