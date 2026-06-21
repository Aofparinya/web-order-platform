"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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

interface MasterType {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}
interface MasterItem {
  id: string;
  code: string;
  name: string;
  value: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
}
interface Setting {
  key: string;
  value: unknown;
  description?: string;
  updatedAt: string;
}
interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: string;
}
interface FileRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  category: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  expiresAt?: string;
}
interface Notice {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
}
interface Template {
  id: string;
  code: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
}
interface AuditLog {
  id: string;
  category: string;
  action: string;
  source: string;
  actorId?: string;
  correlationId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  payload: Record<string, unknown>;
  occurredAt: string;
}
interface Page<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number };
}
interface Dashboard {
  gross_sales: number;
  order_count: number;
  average_order_value: number;
  paymentTotal: number;
  refundTotal: number;
  netSales: number;
  orderStatusBreakdown: { status: string; count: number }[];
}
interface ExportJob {
  id: string;
  report_type: string;
  format: string;
  status: string;
  file_id?: string;
  error?: string;
  created_at: string;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);
const money = (value: number | string | undefined) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(
    Number(value ?? 0),
  );

export function MasterDataPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");
  const [typeForm, setTypeForm] = useState({ code: "", name: "" });
  const [itemForm, setItemForm] = useState({ code: "", name: "", value: "{}" });
  const types = useQuery({
    queryKey: ["master-data-types"],
    queryFn: () => apiFetch<MasterType[]>("master-data/types"),
  });
  const items = useQuery({
    queryKey: ["master-data", selected],
    queryFn: () => apiFetch<MasterItem[]>(`master-data/${selected}`),
    enabled: Boolean(selected),
  });
  const createType = useMutation({
    mutationFn: () =>
      apiFetch("master-data/types", {
        method: "POST",
        body: JSON.stringify(typeForm),
      }),
    onSuccess: () => {
      setTypeForm({ code: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["master-data-types"] });
      toast.success("เพิ่มประเภท Master Data แล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  const createItem = useMutation({
    mutationFn: () =>
      apiFetch(`master-data/${selected}`, {
        method: "POST",
        body: JSON.stringify({
          ...itemForm,
          value: JSON.parse(itemForm.value),
        }),
      }),
    onSuccess: () => {
      setItemForm({ code: "", name: "", value: "{}" });
      queryClient.invalidateQueries({ queryKey: ["master-data", selected] });
      toast.success("เพิ่มรายการแล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <PermissionGate permission={permissions.commonRead}>
      <PageHeader title="Master Data" description="ข้อมูลอ้างอิงกลางของระบบ" />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-bold">ประเภทข้อมูล</h2>
            <Select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">เลือกประเภท</option>
              {types.data?.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Code"
              value={typeForm.code}
              onChange={(event) =>
                setTypeForm({
                  ...typeForm,
                  code: event.target.value.toUpperCase(),
                })
              }
            />
            <Input
              placeholder="ชื่อประเภท"
              value={typeForm.name}
              onChange={(event) =>
                setTypeForm({ ...typeForm, name: event.target.value })
              }
            />
            <Button
              className="w-full"
              onClick={() => createType.mutate()}
              disabled={!typeForm.code || !typeForm.name}
            >
              <Plus /> เพิ่มประเภท
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-bold">รายการ {selected || ""}</h2>
            {selected && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Code"
                  value={itemForm.code}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, code: event.target.value })
                  }
                />
                <Input
                  placeholder="ชื่อ"
                  value={itemForm.name}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, name: event.target.value })
                  }
                />
                <Textarea
                  className="sm:col-span-2 font-mono"
                  value={itemForm.value}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, value: event.target.value })
                  }
                />
                <Button
                  className="sm:col-span-2"
                  onClick={() => createItem.mutate()}
                >
                  <Plus /> เพิ่มรายการ
                </Button>
              </div>
            )}
            <div className="divide-y">
              {items.data?.map((item) => (
                <div key={item.id} className="py-3">
                  <strong>
                    {item.code} · {item.name}
                  </strong>
                  <pre className="mt-1 overflow-auto text-xs text-slate-500">
                    {json(item.value)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}

export function SystemConfigsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["system-configs"],
    queryFn: () => apiFetch<Setting[]>("system-configs"),
  });
  async function edit(item: Setting) {
    const value = window.prompt(
      `แก้ค่า ${item.key} เป็น JSON`,
      json(item.value),
    );
    if (value === null) return;
    try {
      await apiFetch(`system-configs/${item.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          value: JSON.parse(value),
          description: item.description,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["system-configs"] });
      toast.success("บันทึกค่าแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    }
  }
  return (
    <PermissionGate permission={permissions.commonRead}>
      <PageHeader
        title="System Configs"
        description="ค่าระบบที่ไม่ใช่ secrets"
      />
      <Card>
        <CardContent className="divide-y p-5">
          {query.data?.map((item) => (
            <button
              key={item.key}
              className="block w-full py-4 text-left hover:bg-slate-50"
              onClick={() => edit(item)}
            >
              <strong>{item.key}</strong>
              <pre className="mt-1 overflow-auto text-xs text-slate-500">
                {json(item.value)}
              </pre>
            </button>
          ))}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => apiFetch<FeatureFlag[]>("feature-flags"),
  });
  const update = useMutation({
    mutationFn: (item: FeatureFlag) =>
      apiFetch(`feature-flags/${item.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          enabled: !item.enabled,
          description: item.description,
        }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] }),
    onError: (error) => toast.error(error.message),
  });
  return (
    <PermissionGate permission={permissions.commonRead}>
      <PageHeader
        title="Feature Flags"
        description="เปิดหรือปิดความสามารถของระบบแบบ global"
      />
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <Card key={item.key}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <strong>{item.key}</strong>
                <p className="text-sm text-slate-500">
                  {item.description || "ไม่มีคำอธิบาย"}
                </p>
              </div>
              <Button
                variant={item.enabled ? "default" : "outline"}
                onClick={() => update.mutate(item)}
              >
                {item.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}

export function FilesPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState("GENERAL");
  const query = useQuery({
    queryKey: ["files"],
    queryFn: () => apiFetch<FileRecord[]>("files"),
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("กรุณาเลือกไฟล์");
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      return apiFetch<FileRecord>("files", { method: "POST", body: form });
    },
    onSuccess: () => {
      setFile(undefined);
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("อัปโหลดไฟล์แล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  async function download(id: string) {
    const result = await apiFetch<{ url: string }>(`files/${id}/download-url`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  }
  async function remove(id: string) {
    if (!confirm("ยืนยันการลบไฟล์?")) return;
    await apiFetch(`files/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["files"] });
  }
  return (
    <PermissionGate permission={permissions.storageRead}>
      <PageHeader
        title="ไฟล์"
        description="ไฟล์ทั้งหมดเก็บใน MinIO private bucket"
      />
      <Card className="mb-5">
        <CardContent className="grid gap-3 p-5 sm:grid-cols-[1fr_220px_auto]">
          <Input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          <Input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category"
          />
          <Button
            onClick={() => upload.mutate()}
            disabled={!file || upload.isPending}
          >
            <Upload /> อัปโหลด
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div>
                <strong>{item.originalName}</strong>
                <p className="text-xs text-slate-500">
                  {item.mimeType} · {(item.size / 1024).toFixed(1)} KB ·{" "}
                  {item.category}
                </p>
                <p className="text-xs text-slate-400">
                  SHA-256 {item.checksum}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => download(item.id)}>
                  <Download /> ดาวน์โหลด
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(item.id)}
                >
                  <Trash2 className="text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notice[]>("notifications"),
  });
  async function read(id: string) {
    await apiFetch(`notifications/${id}/read`, { method: "PATCH", body: "{}" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function readAll() {
    await apiFetch("notifications/read-all", { method: "POST", body: "{}" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <PermissionGate permission={permissions.notificationsRead}>
      <PageHeader
        title="การแจ้งเตือน"
        description="In-app notifications จาก business events"
        actions={
          <Button variant="outline" onClick={readAll}>
            อ่านทั้งหมด
          </Button>
        }
      />
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <button
            key={item.id}
            className="text-left"
            onClick={() => read(item.id)}
          >
            <Card className="hover:border-blue-300">
              <CardContent className="p-5">
                <strong>{item.title}</strong>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                  {item.body}
                </p>
                <small className="mt-3 block text-slate-400">
                  {new Date(item.createdAt).toLocaleString("th-TH")}
                </small>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </PermissionGate>
  );
}

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    code: "",
    subject: "",
    bodyHtml: "<p>{{.orderNumber}}</p>",
  });
  const query = useQuery({
    queryKey: ["notification-templates"],
    queryFn: () => apiFetch<Template[]>("notification-templates"),
  });
  const create = useMutation({
    mutationFn: () =>
      apiFetch("notification-templates", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("เพิ่มเทมเพลตแล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <PermissionGate permission={permissions.notificationTemplatesRead}>
      <PageHeader
        title="Notification Templates"
        description="เทมเพลต email ด้วย Go html/template"
      />
      <Card className="mb-5">
        <CardContent className="grid gap-3 p-5">
          <Input
            placeholder="Event code เช่น order.paid"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
          <Input
            placeholder="Subject"
            value={form.subject}
            onChange={(event) =>
              setForm({ ...form, subject: event.target.value })
            }
          />
          <Textarea
            className="min-h-32 font-mono"
            value={form.bodyHtml}
            onChange={(event) =>
              setForm({ ...form, bodyHtml: event.target.value })
            }
          />
          <Button onClick={() => create.mutate()}>
            <Plus /> เพิ่มเทมเพลต
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-5">
              <strong>
                {item.code} · {item.subject}
              </strong>
              <pre className="mt-2 overflow-auto text-xs text-slate-500">
                {item.bodyHtml}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}

export function AuditLogsPage() {
  const [category, setCategory] = useState("");
  const query = useQuery({
    queryKey: ["audit-logs", category],
    queryFn: () =>
      apiFetch<Page<AuditLog>>(
        `audit-logs?page=1&pageSize=100${category ? `&category=${category}` : ""}`,
      ),
  });
  return (
    <PermissionGate permission={permissions.auditRead}>
      <PageHeader
        title="Audit Logs"
        description="API activity และ business events ที่ผ่านการ redaction"
      />
      <Select
        className="mb-4 max-w-xs"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="">ทุกประเภท</option>
        <option value="API">API</option>
        <option value="BUSINESS">BUSINESS</option>
      </Select>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-3">เวลา</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">Action</th>
                <th className="p-3">Source</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.data.map((item) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <Link
                      className="text-blue-700"
                      href={`/audit-logs/${item.id}`}
                    >
                      {new Date(item.occurredAt).toLocaleString("th-TH")}
                    </Link>
                  </td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">{item.action}</td>
                  <td className="p-3">{item.source}</td>
                  <td className="p-3">{item.statusCode ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["audit-log", id],
    queryFn: () => apiFetch<AuditLog>(`audit-logs/${id}`),
  });
  return (
    <PermissionGate permission={permissions.auditRead}>
      <PageHeader
        title={query.data?.action ?? "Audit Log"}
        description={query.data?.correlationId}
      />
      <Card>
        <CardContent className="p-5">
          <pre className="overflow-auto text-xs">{json(query.data)}</pre>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export function ReportsPage() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => apiFetch<Dashboard>("reports/dashboard"),
  });
  const sales = useQuery({
    queryKey: ["reports", "sales"],
    queryFn: () => apiFetch<Record<string, unknown>[]>("reports/sales"),
  });
  const exportJob = useMutation({
    mutationFn: (format: "CSV" | "XLSX") =>
      apiFetch("reports/exports", {
        method: "POST",
        body: JSON.stringify({ reportType: "sales", format, filters: {} }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-exports"] });
      toast.success("สร้าง export job แล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  const value = dashboard.data;
  return (
    <PermissionGate permission={permissions.reportsRead}>
      <PageHeader
        title="รายงาน"
        description="ข้อมูล projection แบบ eventual consistency"
        actions={
          <>
            <Button variant="outline" onClick={() => exportJob.mutate("CSV")}>
              <Download /> CSV
            </Button>
            <Button onClick={() => exportJob.mutate("XLSX")}>
              <Download /> XLSX
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports/exports">Export Jobs</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["ยอดขายสุทธิ", money(value?.netSales)],
          ["จำนวนคำสั่งซื้อ", String(value?.order_count ?? 0)],
          ["ยอดชำระ", money(value?.paymentTotal)],
          ["ยอดคืนเงิน", money(value?.refundTotal)],
        ].map(([label, metric]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <strong className="text-2xl">{metric}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardContent className="overflow-x-auto p-5">
          <h2 className="mb-3 font-bold">ยอดขายรายวัน</h2>
          <pre className="text-xs">{json(sales.data ?? [])}</pre>
        </CardContent>
      </Card>
    </PermissionGate>
  );
}

export function ReportExportsPage() {
  const query = useQuery({
    queryKey: ["report-exports"],
    queryFn: () => apiFetch<ExportJob[]>("reports/exports"),
    refetchInterval: 5000,
  });
  async function download(fileId: string) {
    const result = await apiFetch<{ url: string }>(
      `files/${fileId}/download-url`,
    );
    window.open(result.url, "_blank", "noopener,noreferrer");
  }
  return (
    <PermissionGate permission={permissions.reportsRead}>
      <PageHeader
        title="Export Jobs"
        description="ไฟล์หมดอายุหลัง 7 วัน"
        actions={
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCw /> Refresh
          </Button>
        }
      />
      <div className="grid gap-3">
        {query.data?.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
              <div>
                <strong>
                  {item.report_type} · {item.format}
                </strong>
                <p className="text-sm text-slate-500">
                  {item.status} ·{" "}
                  {new Date(item.created_at).toLocaleString("th-TH")}
                </p>
                {item.error && (
                  <p className="text-sm text-red-600">{item.error}</p>
                )}
              </div>
              {item.file_id && (
                <Button onClick={() => download(item.file_id!)}>
                  <Download /> ดาวน์โหลด
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PermissionGate>
  );
}
