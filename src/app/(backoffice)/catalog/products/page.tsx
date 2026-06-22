"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeDollarSign, Boxes, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toQueryString } from "@/lib/query";
import { formatDateTime } from "@/lib/utils";
import type { Category, Page, Price, Product, Sku } from "@/types/api";

const initialForm = () => ({
  name: "",
  description: "",
  status: "ACTIVE",
  skuCode: "",
  skuName: "",
  barcode: "",
  attributes: '{\n  "color": "",\n  "size": ""\n}',
  amount: 0,
  currency: "THB",
  validFrom: new Date().toISOString().slice(0, 16),
});

export default function ProductsPage() {
  const { user } = useSession();
  const router = useRouter();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const incompleteProductId = useRef<string | undefined>(undefined);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    categoryId: "",
    page: 1,
    pageSize: 20,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const products = useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      apiFetch<Page<Product>>(`products${toQueryString(filters)}`),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("categories"),
  });
  const create = useMutation({
    mutationFn: async () => {
      incompleteProductId.current = undefined;
      const attributes = JSON.parse(form.attributes) as Record<
        string,
        unknown
      >;
      const product = await apiFetch<Product>("products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          status: form.status,
        }),
      });
      incompleteProductId.current = product.id;
      const sku = await apiFetch<Sku>(`products/${product.id}/skus`, {
        method: "POST",
        body: JSON.stringify({
          code: form.skuCode,
          name: form.skuName,
          barcode: form.barcode || undefined,
          attributes,
          status: "ACTIVE",
        }),
      });
      await apiFetch<Price>(`skus/${sku.id}/prices`, {
        method: "POST",
        body: JSON.stringify({
          amount: form.amount,
          currency: form.currency,
          validFrom: new Date(form.validFrom).toISOString(),
        }),
      });
      return product;
    },
    onSuccess: (product) => {
      toast.success("สร้างสินค้า SKU และราคาขายเรียบร้อยแล้ว");
      setOpen(false);
      setForm(initialForm());
      incompleteProductId.current = undefined;
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/catalog/products/${product.id}?tab=skus`);
    },
    onError: (error) => {
      toast.error(error.message);
      if (incompleteProductId.current) {
        const productId = incompleteProductId.current;
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.info("สร้าง Product แล้ว กรุณาตรวจและเพิ่มข้อมูลที่เหลือต่อ");
        router.push(`/catalog/products/${productId}?tab=skus`);
      }
    },
  });
  const columns: ColumnDef<Product>[] = [
    {
      header: "เลขสินค้า",
      cell: ({ row }) => (
        <Link
          className="font-semibold text-blue-700"
          href={`/catalog/products/${row.original.id}`}
        >
          {row.original.productNo}
        </Link>
      ),
    },
    { header: "ชื่อสินค้า", accessorKey: "name" },
    {
      header: "สถานะ",
      cell: ({ row }) => <Badge value={row.original.status} />,
    },
    {
      header: "อัปเดตล่าสุด",
      cell: ({ row }) => formatDateTime(row.original.updatedAt),
    },
  ];
  const formReady = Boolean(
    form.name.trim() &&
    form.skuCode.trim() &&
    form.skuName.trim() &&
    form.amount > 0 &&
    form.validFrom,
  );

  return (
    <PermissionGate permission={permissions.catalogRead}>
      <PageHeader
        title="สินค้า"
        description="สร้างสินค้า พร้อม SKU และราคาขายได้ในขั้นตอนเดียว"
        actions={
          writable ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus /> เพิ่มสินค้า
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogTitle>สร้างสินค้าให้พร้อมลงสต็อก</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลสินค้า SKU และราคาขายครั้งแรก
                  จากนั้นจึงเพิ่มรูปและจำนวนสินค้าในคลัง
                </DialogDescription>
                <div className="mt-5 space-y-5">
                  <FormSection
                    icon={<Package className="size-5" />}
                    step="1"
                    title="ข้อมูลสินค้า"
                    description="ข้อมูลหลักที่แสดงในระบบและหน้าร้าน"
                  >
                    <FormField label="ชื่อสินค้า" className="sm:col-span-2">
                      <Input
                        placeholder="เช่น iPhone 17 Pro Max"
                        value={form.name}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField label="สถานะ">
                      <Select
                        value={form.status}
                        onChange={(event) =>
                          setForm({ ...form, status: event.target.value })
                        }
                      >
                        <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
                        <option value="DRAFT">แบบร่าง (DRAFT)</option>
                        <option value="INACTIVE">หยุดใช้งาน (INACTIVE)</option>
                      </Select>
                    </FormField>
                    <FormField
                      label="รายละเอียด"
                      className="sm:col-span-2"
                      hint="ไม่บังคับ"
                    >
                      <Textarea
                        className="min-h-24"
                        placeholder="รายละเอียดหรือจุดเด่นของสินค้า"
                        value={form.description}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                      />
                    </FormField>
                  </FormSection>

                  <FormSection
                    icon={<Boxes className="size-5" />}
                    step="2"
                    title="SKU แรก"
                    description="รายการที่ใช้กำหนดราคาและนับสต็อกจริง"
                  >
                    <FormField
                      label="รหัส SKU"
                      hint="ต้องไม่ซ้ำ เช่น IP17-PRO-BLK-256"
                    >
                      <Input
                        placeholder="IP17-PRO-BLK-256"
                        value={form.skuCode}
                        onChange={(event) =>
                          setForm({ ...form, skuCode: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField label="ชื่อ SKU">
                      <Input
                        placeholder="สีดำ 256GB"
                        value={form.skuName}
                        onChange={(event) =>
                          setForm({ ...form, skuName: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField label="บาร์โค้ด" hint="ไม่บังคับ">
                      <Input
                        placeholder="8851234567890"
                        value={form.barcode}
                        onChange={(event) =>
                          setForm({ ...form, barcode: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField
                      label="คุณลักษณะ"
                      className="sm:col-span-2"
                      hint='รูปแบบ JSON เช่น {"color":"black","storage":"256GB"}'
                    >
                      <Textarea
                        className="min-h-28 font-mono"
                        value={form.attributes}
                        onChange={(event) =>
                          setForm({ ...form, attributes: event.target.value })
                        }
                      />
                    </FormField>
                  </FormSection>

                  <FormSection
                    icon={<BadgeDollarSign className="size-5" />}
                    step="3"
                    title="ราคาขายครั้งแรก"
                    description="ราคานี้จะเริ่มใช้งานตามวันที่และเวลาที่กำหนด"
                  >
                    <FormField label="ราคาขาย">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            amount: Number(event.target.value),
                          })
                        }
                      />
                    </FormField>
                    <FormField label="สกุลเงิน">
                      <Input
                        maxLength={3}
                        value={form.currency}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            currency: event.target.value.toUpperCase(),
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label="เริ่มใช้ราคา"
                      className="sm:col-span-2"
                    >
                      <Input
                        type="datetime-local"
                        value={form.validFrom}
                        onChange={(event) =>
                          setForm({ ...form, validFrom: event.target.value })
                        }
                      />
                    </FormField>
                  </FormSection>

                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!formReady || create.isPending}
                    onClick={() => create.mutate()}
                  >
                    {create.isPending
                      ? "กำลังสร้างสินค้า..."
                      : "สร้างสินค้า SKU และราคาขาย"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_220px]">
        <Input
          placeholder="ค้นหาเลขหรือชื่อสินค้า"
          value={filters.q}
          onChange={(event) =>
            setFilters({ ...filters, q: event.target.value, page: 1 })
          }
        />
        <Select
          value={filters.status}
          onChange={(event) =>
            setFilters({ ...filters, status: event.target.value, page: 1 })
          }
        >
          <option value="">ทุกสถานะ</option>
          <option value="DRAFT">แบบร่าง</option>
          <option value="ACTIVE">พร้อมใช้งาน</option>
          <option value="INACTIVE">หยุดใช้งาน</option>
        </Select>
        <Select
          value={filters.categoryId}
          onChange={(event) =>
            setFilters({ ...filters, categoryId: event.target.value, page: 1 })
          }
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      {products.isLoading ? (
        <LoadingState />
      ) : (
        <DataTable data={products.data?.data ?? []} columns={columns} />
      )}
      <Pagination
        pagination={products.data?.pagination}
        onPageChange={(page) => setFilters({ ...filters, page })}
      />
    </PermissionGate>
  );
}

function FormSection({
  icon,
  step,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold text-blue-600">ขั้นตอน {step}</p>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FormField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
