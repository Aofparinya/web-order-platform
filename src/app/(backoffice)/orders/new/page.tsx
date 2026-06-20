"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import type {
  Customer,
  CustomerAddress,
  Order,
  Page,
  Product,
  Sku,
  TaxProfile,
  Warehouse,
} from "@/types/api";

interface DraftItem {
  skuId: string;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    warehouseId: "",
    billingAddressId: "",
    shippingAddressId: "",
    taxProfileId: "",
    discountType: "NONE",
    discountValue: 0,
    note: "",
  });
  const [items, setItems] = useState<DraftItem[]>([{ skuId: "", quantity: 1 }]);
  const customers = useQuery({ queryKey: ["customers", "order-select"], queryFn: () => apiFetch<Page<Customer>>("customers?page=1&pageSize=100&status=ACTIVE") });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const products = useQuery({ queryKey: ["products", "order-select"], queryFn: () => apiFetch<Page<Product>>("products?page=1&pageSize=100&status=ACTIVE") });
  const skus = useQuery({
    queryKey: ["skus", "order-select", products.data?.data],
    enabled: Boolean(products.data),
    queryFn: async () => (await Promise.all(products.data!.data.map((product) => apiFetch<Sku[]>(`products/${product.id}/skus`)))).flat().filter((sku) => sku.status === "ACTIVE"),
  });
  const addresses = useQuery({
    queryKey: ["customers", form.customerId, "addresses"],
    enabled: Boolean(form.customerId),
    queryFn: () => apiFetch<CustomerAddress[]>(`customers/${form.customerId}/addresses`),
  });
  const taxProfiles = useQuery({
    queryKey: ["customers", form.customerId, "tax-profiles"],
    enabled: Boolean(form.customerId),
    queryFn: () => apiFetch<TaxProfile[]>(`customers/${form.customerId}/tax-profiles`),
  });
  const validItems = useMemo(() => items.filter((item) => item.skuId && item.quantity > 0), [items]);
  const create = useMutation({
    mutationFn: () => apiFetch<Order>("orders", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        customerId: form.customerId,
        warehouseId: form.warehouseId,
        billingAddressId: form.billingAddressId,
        shippingAddressId: form.shippingAddressId,
        taxProfileId: form.taxProfileId || undefined,
        items: validItems,
        discount: form.discountType === "NONE" ? undefined : { type: form.discountType, value: form.discountValue },
        note: form.note || undefined,
      }),
    }),
    onSuccess: (order) => {
      toast.success("สร้าง Draft Order แล้ว");
      router.push(`/orders/${order.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  function updateItem(index: number, changes: Partial<DraftItem>) {
    setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }
  const canSubmit = form.customerId && form.warehouseId && form.billingAddressId && form.shippingAddressId && validItems.length > 0;
  return (
    <PermissionGate permission={permissions.ordersWrite}>
      <PageHeader title="สร้างคำสั่งซื้อ" description="สร้าง Draft จากข้อมูลลูกค้า ราคา และ SKU ปัจจุบัน" />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card><CardContent className="grid gap-4 p-6">
          <h2 className="font-bold">ลูกค้าและคลังสินค้า</h2>
          <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value, billingAddressId: "", shippingAddressId: "", taxProfileId: "" })}>
            <option value="">เลือกลูกค้า</option>
            {customers.data?.data.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerNo} · {customer.companyName ?? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`}</option>)}
          </Select>
          <Select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}>
            <option value="">เลือกคลังสินค้า</option>
            {warehouses.data?.filter((warehouse) => warehouse.status === "ACTIVE").map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
          </Select>
          <Select value={form.billingAddressId} onChange={(event) => setForm({ ...form, billingAddressId: event.target.value })}>
            <option value="">เลือกที่อยู่ออก Invoice</option>
            {addresses.data?.filter((address) => address.addressType === "BILLING").map((address) => <option key={address.id} value={address.id}>{address.line1}, {address.province}</option>)}
          </Select>
          <Select value={form.shippingAddressId} onChange={(event) => setForm({ ...form, shippingAddressId: event.target.value })}>
            <option value="">เลือกที่อยู่จัดส่ง</option>
            {addresses.data?.filter((address) => address.addressType === "SHIPPING").map((address) => <option key={address.id} value={address.id}>{address.line1}, {address.province}</option>)}
          </Select>
          <Select value={form.taxProfileId} onChange={(event) => setForm({ ...form, taxProfileId: event.target.value })}>
            <option value="">ไม่ใช้ข้อมูลภาษี</option>
            {taxProfiles.data?.map((tax) => <option key={tax.id} value={tax.id}>{tax.taxId} · {tax.branchType}</option>)}
          </Select>
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}>
              <option value="NONE">ไม่มีส่วนลด</option><option value="PERCENT">เปอร์เซ็นต์</option><option value="FIXED">จำนวนเงิน</option>
            </Select>
            <Input type="number" min={0} disabled={form.discountType === "NONE"} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })} />
          </div>
          <Textarea placeholder="หมายเหตุ" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">รายการสินค้า</h2><Button variant="outline" onClick={() => setItems([...items, { skuId: "", quantity: 1 }])}><Plus /> เพิ่มรายการ</Button></div>
          <div className="space-y-3">
            {items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_120px_44px]">
              <Select value={item.skuId} onChange={(event) => updateItem(index, { skuId: event.target.value })}>
                <option value="">เลือก SKU</option>
                {skus.data?.map((sku) => <option key={sku.id} value={sku.id}>{sku.code} · {sku.name}</option>)}
              </Select>
              <Input type="number" min={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
              <Button variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}><Minus /></Button>
            </div>)}
          </div>
          <Button className="mt-5 w-full" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "กำลังสร้าง..." : "สร้าง Draft Order"}
          </Button>
        </CardContent></Card>
      </div>
    </PermissionGate>
  );
}
