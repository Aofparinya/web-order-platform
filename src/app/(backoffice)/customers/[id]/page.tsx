"use client";

import * as Tabs from "@radix-ui/react-tabs";
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
import type {
  Customer,
  CustomerAddress,
  CustomerContact,
  TaxProfile,
} from "@/types/api";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const writable = can(user, permissions.customersWrite);
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: ["customers", id], queryFn: () => apiFetch<Customer>(`customers/${id}`) });
  const addresses = useQuery({ queryKey: ["customers", id, "addresses"], queryFn: () => apiFetch<CustomerAddress[]>(`customers/${id}/addresses`) });
  const contacts = useQuery({ queryKey: ["customers", id, "contacts"], queryFn: () => apiFetch<CustomerContact[]>(`customers/${id}/contacts`) });
  const taxProfiles = useQuery({ queryKey: ["customers", id, "tax-profiles"], queryFn: () => apiFetch<TaxProfile[]>(`customers/${id}/tax-profiles`) });
  const [address, setAddress] = useState({ addressType: "BILLING", line1: "", province: "", postalCode: "", countryCode: "TH", isDefault: false });
  const [contact, setContact] = useState({ firstName: "", lastName: "", position: "", email: "", phone: "", isPrimary: false });
  const [tax, setTax] = useState({ taxId: "", branchType: "HEAD_OFFICE", branchCode: "00000", branchName: "", addressLine1: "", province: "", postalCode: "", countryCode: "TH" });
  const refresh = (key: string) => queryClient.invalidateQueries({ queryKey: ["customers", id, key] });
  const createAddress = useMutation({
    mutationFn: () => apiFetch<CustomerAddress>(`customers/${id}/addresses`, { method: "POST", body: JSON.stringify(address) }),
    onSuccess: () => { toast.success("เพิ่มที่อยู่แล้ว"); refresh("addresses"); setAddress({ ...address, line1: "", province: "", postalCode: "" }); },
    onError: (error) => toast.error(error.message),
  });
  const createContact = useMutation({
    mutationFn: () => apiFetch<CustomerContact>(`customers/${id}/contacts`, { method: "POST", body: JSON.stringify({ ...contact, position: contact.position || undefined, email: contact.email || undefined, phone: contact.phone || undefined }) }),
    onSuccess: () => { toast.success("เพิ่มผู้ติดต่อแล้ว"); refresh("contacts"); setContact({ ...contact, firstName: "", lastName: "", position: "", email: "", phone: "" }); },
    onError: (error) => toast.error(error.message),
  });
  const createTax = useMutation({
    mutationFn: () => apiFetch<TaxProfile>(`customers/${id}/tax-profiles`, { method: "POST", body: JSON.stringify({ ...tax, branchName: tax.branchName || undefined }) }),
    onSuccess: () => { toast.success("เพิ่มข้อมูลภาษีแล้ว"); refresh("tax-profiles"); setTax({ ...tax, taxId: "", branchName: "", addressLine1: "", province: "", postalCode: "" }); },
    onError: (error) => toast.error(error.message),
  });
  async function remove(path: string, key: string) {
    if (!confirm("ยืนยันการลบข้อมูลนี้?")) return;
    try { await apiFetch<void>(path, { method: "DELETE" }); toast.success("ลบข้อมูลแล้ว"); refresh(key); } catch (error) { toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ"); }
  }
  if (customer.isLoading) return <LoadingState />;
  return (
    <PermissionGate permission={permissions.customersRead}>
      <PageHeader title={customer.data?.companyName ?? `${customer.data?.firstName ?? ""} ${customer.data?.lastName ?? ""}`} description={customer.data?.customerNo} actions={customer.data ? <Badge value={customer.data.status} /> : undefined} />
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
          {["overview:ข้อมูลหลัก", "addresses:ที่อยู่", "contacts:ผู้ติดต่อ", "tax:ภาษี"].map((item) => {
            const [value, label] = item.split(":");
            return <Tabs.Trigger key={value} value={value} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white">{label}</Tabs.Trigger>;
          })}
        </Tabs.List>
        <Tabs.Content value="overview">
          {customer.data && <CustomerOverview customer={customer.data} writable={writable} />}
        </Tabs.Content>
        <Tabs.Content value="addresses">
          {writable && <InlineForm title="เพิ่มที่อยู่" onSubmit={() => createAddress.mutate()}>
            <Select value={address.addressType} onChange={(event) => setAddress({ ...address, addressType: event.target.value })}><option>BILLING</option><option>SHIPPING</option><option>CONTACT</option></Select>
            <Input placeholder="ที่อยู่" value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} />
            <Input placeholder="จังหวัด" value={address.province} onChange={(event) => setAddress({ ...address, province: event.target.value })} />
            <Input placeholder="รหัสไปรษณีย์" value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} />
          </InlineForm>}
          <ItemGrid>{addresses.data?.map((item) => <Item key={item.id} title={`${item.addressType}${item.isDefault ? " · Default" : ""}`} detail={`${item.line1}, ${item.province} ${item.postalCode}`} onDelete={writable ? () => remove(`customers/${id}/addresses/${item.id}`, "addresses") : undefined} />)}</ItemGrid>
        </Tabs.Content>
        <Tabs.Content value="contacts">
          {writable && <InlineForm title="เพิ่มผู้ติดต่อ" onSubmit={() => createContact.mutate()}>
            <Input placeholder="ชื่อ" value={contact.firstName} onChange={(event) => setContact({ ...contact, firstName: event.target.value })} />
            <Input placeholder="นามสกุล" value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} />
            <Input placeholder="อีเมล" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
            <Input placeholder="โทรศัพท์" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
          </InlineForm>}
          <ItemGrid>{contacts.data?.map((item) => <Item key={item.id} title={`${item.firstName} ${item.lastName}${item.isPrimary ? " · Primary" : ""}`} detail={[item.position, item.email, item.phone].filter(Boolean).join(" · ")} onDelete={writable ? () => remove(`customers/${id}/contacts/${item.id}`, "contacts") : undefined} />)}</ItemGrid>
        </Tabs.Content>
        <Tabs.Content value="tax">
          {writable && <InlineForm title="เพิ่มข้อมูลภาษี" onSubmit={() => createTax.mutate()}>
            <Input placeholder="เลขประจำตัวผู้เสียภาษี" value={tax.taxId} onChange={(event) => setTax({ ...tax, taxId: event.target.value })} />
            <Select value={tax.branchType} onChange={(event) => setTax({ ...tax, branchType: event.target.value })}><option>HEAD_OFFICE</option><option>BRANCH</option></Select>
            <Input placeholder="ที่อยู่ออกใบกำกับภาษี" value={tax.addressLine1} onChange={(event) => setTax({ ...tax, addressLine1: event.target.value })} />
            <Input placeholder="จังหวัด" value={tax.province} onChange={(event) => setTax({ ...tax, province: event.target.value })} />
            <Input placeholder="รหัสไปรษณีย์" value={tax.postalCode} onChange={(event) => setTax({ ...tax, postalCode: event.target.value })} />
          </InlineForm>}
          <ItemGrid>{taxProfiles.data?.map((item) => <Item key={item.id} title={`${item.taxId} · ${item.branchType}`} detail={`${item.addressLine1}, ${item.province} ${item.postalCode}`} onDelete={writable ? () => remove(`customers/${id}/tax-profiles/${item.id}`, "tax-profiles") : undefined} />)}</ItemGrid>
        </Tabs.Content>
      </Tabs.Root>
    </PermissionGate>
  );
}

function CustomerOverview({ customer, writable }: { customer: Customer; writable: boolean }) {
  const queryClient = useQueryClient();
  const [main, setMain] = useState({
    status: customer.status,
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    companyName: customer.companyName ?? "",
    registrationNumber: customer.registrationNumber ?? "",
    note: customer.note ?? "",
  });
  const update = useMutation({
    mutationFn: () => apiFetch<Customer>(`customers/${customer.id}`, { method: "PATCH", body: JSON.stringify({ ...main, registrationNumber: main.registrationNumber || undefined, note: main.note || undefined }) }),
    onSuccess: () => { toast.success("บันทึกข้อมูลลูกค้าแล้ว"); queryClient.invalidateQueries({ queryKey: ["customers", customer.id] }); },
    onError: (error) => toast.error(error.message),
  });
  return <Card><CardContent className="grid gap-4 p-6 sm:grid-cols-2">
    <Select disabled={!writable} value={main.status} onChange={(event) => setMain({ ...main, status: event.target.value as Customer["status"] })}><option>ACTIVE</option><option>INACTIVE</option><option>BLOCKED</option></Select>
    {customer.customerType === "INDIVIDUAL" ? <>
      <Input disabled={!writable} value={main.firstName} onChange={(event) => setMain({ ...main, firstName: event.target.value })} placeholder="ชื่อ" />
      <Input disabled={!writable} value={main.lastName} onChange={(event) => setMain({ ...main, lastName: event.target.value })} placeholder="นามสกุล" />
    </> : <Input disabled={!writable} className="sm:col-span-2" value={main.companyName} onChange={(event) => setMain({ ...main, companyName: event.target.value })} placeholder="ชื่อบริษัท" />}
    <Input disabled={!writable} className="sm:col-span-2" value={main.registrationNumber} onChange={(event) => setMain({ ...main, registrationNumber: event.target.value })} placeholder="เลขทะเบียน" />
    <Textarea disabled={!writable} className="sm:col-span-2" value={main.note} onChange={(event) => setMain({ ...main, note: event.target.value })} placeholder="หมายเหตุ" />
    {writable && <Button className="sm:col-span-2" onClick={() => update.mutate()}>บันทึกข้อมูลหลัก</Button>}
  </CardContent></Card>;
}

function InlineForm({ title, onSubmit, children }: { title: string; onSubmit: () => void; children: React.ReactNode }) {
  return <Card className="mb-4"><CardContent className="p-5"><h3 className="mb-4 font-bold">{title}</h3><div className="grid gap-3 sm:grid-cols-2">{children}<Button onClick={onSubmit} className="sm:col-span-2"><Plus /> เพิ่มข้อมูล</Button></div></CardContent></Card>;
}
function ItemGrid({ children }: { children: React.ReactNode }) { return <div className="grid gap-3 lg:grid-cols-2">{children}</div>; }
function Item({ title, detail, onDelete }: { title: string; detail: string; onDelete?: () => void }) {
  return <Card><CardContent className="flex items-start justify-between p-5"><div><strong>{title}</strong><p className="mt-1 text-sm text-slate-500">{detail || "-"}</p></div>{onDelete && <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="size-4 text-red-600" /></Button>}</CardContent></Card>;
}
