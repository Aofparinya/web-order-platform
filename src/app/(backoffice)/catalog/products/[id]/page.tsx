"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import type {
  Category,
  Product,
  ProductCategory,
  ProductImage,
  Sku,
} from "@/types/api";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const product = useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<Product>(`products/${id}`),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("categories"),
  });
  const assigned = useQuery({
    queryKey: ["products", id, "categories"],
    queryFn: () => apiFetch<ProductCategory[]>(`products/${id}/categories`),
  });
  const images = useQuery({
    queryKey: ["products", id, "images"],
    queryFn: () => apiFetch<ProductImage[]>(`products/${id}/images`),
  });
  const skus = useQuery({
    queryKey: ["products", id, "skus"],
    queryFn: () => apiFetch<Sku[]>(`products/${id}/skus`),
  });
  const [category, setCategory] = useState({
    categoryId: "",
    isPrimary: false,
  });
  const [image, setImage] = useState({
    fileId: "",
    altText: "",
    sortOrder: 0,
    isPrimary: false,
  });
  const [uploadFile, setUploadFile] = useState<File>();
  const [sku, setSku] = useState({
    code: "",
    barcode: "",
    name: "",
    attributes: '{\n  "color": "black"\n}',
    status: "ACTIVE",
  });
  const refresh = (key: string) =>
    queryClient.invalidateQueries({ queryKey: ["products", id, key] });
  const assign = useMutation({
    mutationFn: () =>
      apiFetch<ProductCategory>(`products/${id}/categories`, {
        method: "POST",
        body: JSON.stringify(category),
      }),
    onSuccess: () => {
      toast.success("เพิ่มหมวดหมู่แล้ว");
      refresh("categories");
    },
    onError: (error) => toast.error(error.message),
  });
  const addImage = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("category", "PRODUCT_IMAGE");
      form.append("entityType", "PRODUCT");
      form.append("entityId", id);
      const uploaded = await apiFetch<{ id: string }>("files", {
        method: "POST",
        body: form,
      });
      return apiFetch<ProductImage>(`products/${id}/images`, {
        method: "POST",
        body: JSON.stringify({
          ...image,
          fileId: uploaded.id,
          altText: image.altText || undefined,
        }),
      });
    },
    onSuccess: () => {
      setUploadFile(undefined);
      toast.success("อัปโหลดรูปสินค้าแล้ว");
      refresh("images");
    },
    onError: (error) => toast.error(error.message),
  });
  const addSku = useMutation({
    mutationFn: () =>
      apiFetch<Sku>(`products/${id}/skus`, {
        method: "POST",
        body: JSON.stringify({
          ...sku,
          barcode: sku.barcode || undefined,
          attributes: JSON.parse(sku.attributes) as Record<string, unknown>,
        }),
      }),
    onSuccess: () => {
      toast.success("เพิ่ม SKU แล้ว");
      refresh("skus");
    },
    onError: (error) => toast.error(error.message),
  });
  async function remove(path: string, key: string) {
    if (!confirm("ยืนยันการลบ?")) return;
    try {
      await apiFetch<void>(path, { method: "DELETE" });
      toast.success("ลบข้อมูลแล้ว");
      refresh(key);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบไม่สำเร็จ");
    }
  }
  if (product.isLoading) return <LoadingState />;
  return (
    <PermissionGate permission={permissions.catalogRead}>
      <PageHeader
        title={product.data?.name ?? "รายละเอียดสินค้า"}
        description={product.data?.productNo}
        actions={
          product.data ? <Badge value={product.data.status} /> : undefined
        }
      />
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
          {[
            "overview:ข้อมูลหลัก",
            "categories:หมวดหมู่",
            "images:รูปภาพ",
            "skus:SKU",
          ].map((item) => {
            const [value, label] = item.split(":");
            return (
              <Tabs.Trigger
                key={value}
                value={value}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {label}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
        <Tabs.Content value="overview">
          {product.data && (
            <ProductOverview product={product.data} writable={writable} />
          )}
        </Tabs.Content>
        <Tabs.Content value="categories">
          {writable && (
            <Card className="mb-4">
              <CardContent className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_auto]">
                <Select
                  value={category.categoryId}
                  onChange={(event) =>
                    setCategory({ ...category, categoryId: event.target.value })
                  }
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={category.isPrimary}
                    onChange={(event) =>
                      setCategory({
                        ...category,
                        isPrimary: event.target.checked,
                      })
                    }
                  />{" "}
                  Primary
                </label>
                <Button onClick={() => assign.mutate()}>
                  <Plus /> เพิ่ม
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {assigned.data?.map((item) => {
              const detail = categories.data?.find(
                (categoryItem) => categoryItem.id === item.categoryId,
              );
              return (
                <Card key={item.categoryId}>
                  <CardContent className="flex items-center justify-between p-4">
                    <span>
                      <strong>{detail?.name ?? item.categoryId}</strong>
                      {item.isPrimary && (
                        <small className="ml-2 text-blue-600">Primary</small>
                      )}
                    </span>
                    {writable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          remove(
                            `products/${id}/categories/${item.categoryId}`,
                            "categories",
                          )
                        }
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Tabs.Content>
        <Tabs.Content value="images">
          {writable && (
            <Card className="mb-4">
              <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setUploadFile(event.target.files?.[0])}
                />
                <Input
                  placeholder="Alt text"
                  value={image.altText}
                  onChange={(event) =>
                    setImage({ ...image, altText: event.target.value })
                  }
                />
                <Input
                  type="number"
                  placeholder="Sort order"
                  value={image.sortOrder}
                  onChange={(event) =>
                    setImage({
                      ...image,
                      sortOrder: Number(event.target.value),
                    })
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={image.isPrimary}
                    onChange={(event) =>
                      setImage({ ...image, isPrimary: event.target.checked })
                    }
                  />{" "}
                  Primary image
                </label>
                <Button
                  className="sm:col-span-2"
                  onClick={() => addImage.mutate()}
                >
                  <Plus /> อัปโหลดและเพิ่มรูปสินค้า
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {images.data?.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <ProductImagePreview
                    fileId={item.fileId}
                    alt={item.altText ?? "รูปสินค้า"}
                  />
                  <strong className="mt-3 block">
                    {item.altText || "ไม่มี Alt text"}
                  </strong>
                  <p className="truncate text-xs text-slate-500">
                    {item.fileId}
                  </p>
                  {item.isPrimary && (
                    <span className="text-xs font-semibold text-blue-600">
                      Primary
                    </span>
                  )}
                  {writable && (
                    <Button
                      className="mt-2"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        remove(`products/${id}/images/${item.id}`, "images")
                      }
                    >
                      <Trash2 className="size-4 text-red-600" /> ลบ
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </Tabs.Content>
        <Tabs.Content value="skus">
          {writable && (
            <Card className="mb-4">
              <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                <Input
                  placeholder="SKU Code"
                  value={sku.code}
                  onChange={(event) =>
                    setSku({ ...sku, code: event.target.value })
                  }
                />
                <Input
                  placeholder="Barcode"
                  value={sku.barcode}
                  onChange={(event) =>
                    setSku({ ...sku, barcode: event.target.value })
                  }
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="ชื่อ SKU"
                  value={sku.name}
                  onChange={(event) =>
                    setSku({ ...sku, name: event.target.value })
                  }
                />
                <Textarea
                  className="sm:col-span-2 font-mono"
                  value={sku.attributes}
                  onChange={(event) =>
                    setSku({ ...sku, attributes: event.target.value })
                  }
                />
                <Button
                  className="sm:col-span-2"
                  onClick={() => addSku.mutate()}
                >
                  <Plus /> เพิ่ม SKU
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {skus.data?.map((item) => (
              <Link key={item.id} href={`/catalog/skus/${item.id}`}>
                <Card className="hover:border-blue-300">
                  <CardContent className="flex items-center justify-between p-4">
                    <span>
                      <strong>
                        {item.code} · {item.name}
                      </strong>
                      <small className="block text-slate-500">
                        {JSON.stringify(item.attributes)}
                      </small>
                    </span>
                    <Badge value={item.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PermissionGate>
  );
}

function ProductOverview({
  product,
  writable,
}: {
  product: Product;
  writable: boolean;
}) {
  const queryClient = useQueryClient();
  const [main, setMain] = useState({
    name: product.name,
    description: product.description ?? "",
    status: product.status,
  });
  const update = useMutation({
    mutationFn: () =>
      apiFetch<Product>(`products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...main,
          description: main.description || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("บันทึกสินค้าแล้ว");
      queryClient.invalidateQueries({ queryKey: ["products", product.id] });
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Card>
      <CardContent className="grid gap-4 p-6">
        <Input
          disabled={!writable}
          value={main.name}
          onChange={(event) => setMain({ ...main, name: event.target.value })}
        />
        <Select
          disabled={!writable}
          value={main.status}
          onChange={(event) =>
            setMain({
              ...main,
              status: event.target.value as Product["status"],
            })
          }
        >
          <option>DRAFT</option>
          <option>ACTIVE</option>
          <option>INACTIVE</option>
        </Select>
        <Textarea
          disabled={!writable}
          value={main.description}
          onChange={(event) =>
            setMain({ ...main, description: event.target.value })
          }
        />
        {writable && (
          <Button onClick={() => update.mutate()}>บันทึกข้อมูลสินค้า</Button>
        )}
      </CardContent>
    </Card>
  );
}
function ProductImagePreview({ fileId, alt }: { fileId: string; alt: string }) {
  const url = useQuery({
    queryKey: ["files", fileId, "preview"],
    queryFn: () =>
      apiFetch<{ url: string }>(`files/${fileId}/download-url?inline=true`),
    staleTime: 10 * 60 * 1000,
  });
  if (!url.data?.url)
    return (
      <div className="grid h-32 place-items-center rounded-lg bg-slate-100 text-xs text-slate-400">
        กำลังโหลดรูป...
      </div>
    );
  return (
    <div
      role="img"
      aria-label={alt}
      className="h-32 w-full rounded-lg bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${url.data.url}")` }}
    />
  );
}
