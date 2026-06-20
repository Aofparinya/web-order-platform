"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { can, permissions } from "@/lib/permissions";
import type { Category } from "@/types/api";

export default function CategoriesPage() {
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", parentId: "", status: "ACTIVE" });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => apiFetch<Category[]>("categories") });
  const create = useMutation({
    mutationFn: () => apiFetch<Category>("categories", { method: "POST", body: JSON.stringify({ ...form, parentId: form.parentId || undefined, description: form.description || undefined }) }),
    onSuccess: () => { toast.success("เพิ่มหมวดหมู่แล้ว"); setOpen(false); setForm({ code: "", name: "", description: "", parentId: "", status: "ACTIVE" }); queryClient.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (error) => toast.error(error.message),
  });
  async function remove(id: string) {
    if (!confirm("ยืนยันการลบหมวดหมู่? หมวดหมู่ที่มี child หรือสินค้าใช้งานอยู่จะลบไม่ได้")) return;
    try { await apiFetch<void>(`categories/${id}`, { method: "DELETE" }); toast.success("ลบหมวดหมู่แล้ว"); queryClient.invalidateQueries({ queryKey: ["categories"] }); } catch (error) { toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ"); }
  }
  const roots = categories.data?.filter((category) => !category.parentId) ?? [];
  return (
    <PermissionGate permission={permissions.catalogRead}>
      <PageHeader title="หมวดหมู่สินค้า" description="จัดลำดับ parent-child และสถานะการใช้งาน" actions={writable ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> เพิ่มหมวดหมู่</Button></DialogTrigger><DialogContent><DialogTitle>เพิ่มหมวดหมู่</DialogTitle><DialogDescription>รหัสหมวดหมู่ต้องไม่ซ้ำกัน</DialogDescription><div className="mt-5 grid gap-4"><Input placeholder="Code เช่น APPAREL" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><Input placeholder="ชื่อหมวดหมู่" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Select value={form.parentId} onChange={(event) => setForm({ ...form, parentId: event.target.value })}><option value="">ไม่มีหมวดหมู่แม่</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select><Textarea placeholder="คำอธิบาย" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><Button onClick={() => create.mutate()}>บันทึกหมวดหมู่</Button></div></DialogContent></Dialog> : undefined} />
      {categories.isLoading ? <LoadingState /> : <div className="space-y-3">{roots.map((category) => <CategoryNode key={category.id} category={category} all={categories.data ?? []} writable={writable} onDelete={remove} />)}{!roots.length && <LoadingState text="ยังไม่มีหมวดหมู่" />}</div>}
    </PermissionGate>
  );
}

function CategoryNode({ category, all, writable, onDelete, depth = 0 }: { category: Category; all: Category[]; writable: boolean; onDelete: (id: string) => void; depth?: number }) {
  const children = all.filter((item) => item.parentId === category.id);
  return <div style={{ marginLeft: Math.min(depth * 24, 72) }}><Card><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><ChevronRight className="size-4 text-slate-400" /><div><strong>{category.name}</strong><p className="text-xs text-slate-500">{category.code}{category.description ? ` · ${category.description}` : ""}</p></div></div><div className="flex items-center gap-2"><Badge value={category.status} />{writable && <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)}><Trash2 className="size-4 text-red-600" /></Button>}</div></CardContent></Card><div className="mt-2 space-y-2">{children.map((child) => <CategoryNode key={child.id} category={child} all={all} writable={writable} onDelete={onDelete} depth={depth + 1} />)}</div></div>;
}
