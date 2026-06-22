"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  Category,
  Page,
  Price,
  Product,
  ProductCategory,
  ProductImage,
  Sku,
} from "@/types/api";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = ["overview", "categories", "images", "skus"].includes(
    searchParams.get("tab") ?? "",
  )
    ? searchParams.get("tab")!
    : "overview";
  const { user } = useSession();
  const writable = can(user, permissions.catalogWrite);
  const queryClient = useQueryClient();
  const product = useQuery({
    queryKey: ["products", id],
    queryFn: () => apiFetch<Product>(`products/${id}`),
  });
  const productOptions = useQuery({
    queryKey: ["products", "selector"],
    queryFn: async () => {
      const firstPage = await apiFetch<Page<Product>>(
        "products?page=1&pageSize=100",
      );
      if (firstPage.pagination.totalPages <= 1) {
        return firstPage.data;
      }
      const remainingPages = await Promise.all(
        Array.from(
          { length: firstPage.pagination.totalPages - 1 },
          (_, index) =>
            apiFetch<Page<Product>>(
              `products?page=${index + 2}&pageSize=100`,
            ),
        ),
      );
      return [firstPage.data, ...remainingPages.map((page) => page.data)]
        .flat()
        .sort((left, right) =>
          left.productNo.localeCompare(right.productNo, "th"),
        );
    },
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
    amount: 0,
    currency: "THB",
    validFrom: new Date().toISOString().slice(0, 16),
  });
  const firstSku = skus.data?.[0];
  const refresh = (key: string) =>
    queryClient.invalidateQueries({ queryKey: ["products", id, key] });
  const assign = useMutation({
    mutationFn: () =>
      apiFetch<ProductCategory>(`products/${id}/categories`, {
        method: "POST",
        body: JSON.stringify(category),
      }),
    onSuccess: () => {
      setCategory({ categoryId: "", isPrimary: false });
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
      setImage({
        fileId: "",
        altText: "",
        sortOrder: 0,
        isPrimary: false,
      });
      toast.success("อัปโหลดรูปสินค้าแล้ว");
      refresh("images");
    },
    onError: (error) => toast.error(error.message),
  });
  const addSku = useMutation({
    mutationFn: async () => {
      const createdSku = await apiFetch<Sku>(`products/${id}/skus`, {
        method: "POST",
        body: JSON.stringify({
          code: sku.code,
          name: sku.name,
          barcode: sku.barcode || undefined,
          attributes: JSON.parse(sku.attributes) as Record<string, unknown>,
          status: sku.status,
        }),
      });
      await apiFetch<Price>(`skus/${createdSku.id}/prices`, {
        method: "POST",
        body: JSON.stringify({
          amount: sku.amount,
          currency: sku.currency,
          validFrom: new Date(sku.validFrom).toISOString(),
        }),
      });
      return createdSku;
    },
    onSuccess: () => {
      setSku({
        code: "",
        barcode: "",
        name: "",
        attributes: '{\n  "color": "black"\n}',
        status: "ACTIVE",
        amount: 0,
        currency: "THB",
        validFrom: new Date().toISOString().slice(0, 16),
      });
      toast.success("เพิ่ม SKU และราคาขายแล้ว");
      refresh("skus");
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => refresh("skus"),
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
      <Link
        href="/catalog/products"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"
      >
        <ArrowLeft className="size-4" /> กลับไปหน้ารายการสินค้า
      </Link>
      <PageHeader
        title={product.data?.name ?? "รายละเอียดสินค้า"}
        description={product.data?.productNo}
        actions={
          product.data ? <Badge value={product.data.status} /> : undefined
        }
      />
      <Card className="mb-5">
        <CardContent className="grid gap-2 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
          <div>
            <p className="font-semibold text-slate-900">เลือกสินค้า</p>
            <p className="text-sm text-slate-500">
              เลือก Product ที่ต้องการจัดการข้อมูล
            </p>
          </div>
          <Select
            aria-label="เลือกสินค้า"
            value={id}
            disabled={productOptions.isLoading}
            onChange={(event) => {
              if (!event.target.value || event.target.value === id) return;
              router.push(
                `/catalog/products/${event.target.value}?tab=${activeTab}`,
              );
            }}
          >
            {productOptions.isLoading && (
              <option value={id}>กำลังโหลดรายการสินค้า...</option>
            )}
            {!productOptions.isLoading && productOptions.data?.length === 0 && (
              <option value={id}>ไม่พบสินค้า</option>
            )}
            {productOptions.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.productNo} · {item.name} · {item.status}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>
      <ProductWorkflow
        activeTab={activeTab}
        skuId={firstSku?.id}
        categoryCount={assigned.data?.length ?? 0}
        imageCount={images.data?.length ?? 0}
        skuCount={skus.data?.length ?? 0}
        onTabChange={(tab) =>
          router.replace(`/catalog/products/${id}?tab=${tab}`)
        }
      />
      <Tabs.Root
        key={id}
        value={activeTab}
        onValueChange={(tab) =>
          router.replace(`/catalog/products/${id}?tab=${tab}`)
        }
      >
        <Tabs.List className="mb-5 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
          {[
            { value: "overview", label: "ข้อมูลหลัก" },
            {
              value: "categories",
              label: "หมวดหมู่",
              count: assigned.data?.length,
            },
            { value: "images", label: "รูปภาพ", count: images.data?.length },
            { value: "skus", label: "SKU", count: skus.data?.length },
          ].map((item) => {
            return (
              <Tabs.Trigger
                key={item.value}
                value={item.value}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {item.label}
                {typeof item.count === "number" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                    {item.count}
                  </span>
                )}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
        <Tabs.Content value="overview">
          <div className="grid gap-5">
            {product.data && (
              <ProductOverview
                key={product.data.id}
                product={product.data}
                writable={writable}
              />
            )}
            <Card>
              <CardContent className="p-6">
                <SectionIntro
                  title="ราคาขาย"
                  description="ราคาเชื่อมกับ SKU แต่ละรายการ สามารถเพิ่มหรือแก้ไขได้จากหน้านี้"
                />
                {skus.isLoading ? (
                  <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                    กำลังโหลด SKU และราคา...
                  </div>
                ) : skus.data?.length ? (
                  <div className="mt-5 grid gap-3">
                    {skus.data.map((item) => (
                      <SkuPricingCard
                        key={`overview-${item.id}`}
                        sku={item}
                        writable={writable}
                      />
                    ))}
                  </div>
                ) : writable ? (
                  <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                        <CircleDollarSign className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-950">
                          สร้าง SKU แรกพร้อมราคาขาย
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          สินค้าต้องมี SKU ก่อนจึงจะกำหนดราคาและเพิ่มสต็อกได้
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <FormField
                        label="รหัส SKU"
                        hint="ต้องไม่ซ้ำ เช่น VBVB-DEFAULT"
                      >
                        <Input
                          placeholder="VBVB-DEFAULT"
                          value={sku.code}
                          onChange={(event) =>
                            setSku({ ...sku, code: event.target.value })
                          }
                        />
                      </FormField>
                      <FormField label="ชื่อ SKU">
                        <Input
                          placeholder="ตัวเลือกมาตรฐาน"
                          value={sku.name}
                          onChange={(event) =>
                            setSku({ ...sku, name: event.target.value })
                          }
                        />
                      </FormField>
                      <FormField label="ราคาขาย">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={sku.amount}
                          onChange={(event) =>
                            setSku({
                              ...sku,
                              amount: Number(event.target.value),
                            })
                          }
                        />
                      </FormField>
                      <FormField label="สกุลเงิน">
                        <Input
                          maxLength={3}
                          value={sku.currency}
                          onChange={(event) =>
                            setSku({
                              ...sku,
                              currency: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </FormField>
                      <FormField
                        className="sm:col-span-2"
                        label="เริ่มใช้ราคา"
                      >
                        <Input
                          type="datetime-local"
                          value={sku.validFrom}
                          onChange={(event) =>
                            setSku({ ...sku, validFrom: event.target.value })
                          }
                        />
                      </FormField>
                      <Button
                        className="self-end sm:col-span-2"
                        disabled={
                          !sku.code.trim() ||
                          !sku.name.trim() ||
                          sku.amount <= 0 ||
                          !sku.validFrom ||
                          addSku.isPending
                        }
                        onClick={() => addSku.mutate()}
                      >
                        <Plus />
                        {addSku.isPending
                          ? "กำลังสร้าง..."
                          : "สร้าง SKU และบันทึกราคา"}
                      </Button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      ต้องการกำหนดสี ไซซ์ บาร์โค้ด หรือคุณลักษณะเพิ่มเติม
                      สามารถแก้ได้ในแท็บ SKU หลังจากสร้างแล้ว
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-slate-500">
                    สินค้านี้ยังไม่มี SKU จึงยังไม่สามารถกำหนดราคาได้
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs.Content>
        <Tabs.Content value="categories">
          {writable && (
            <Card className="mb-4">
              <CardContent className="p-5">
                <SectionIntro
                  title="จัดหมวดหมู่สินค้า"
                  description="ช่วยให้ค้นหาและจัดกลุ่มสินค้าในหน้าร้านได้ง่ายขึ้น"
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <FormField label="หมวดหมู่">
                    <Select
                      value={category.categoryId}
                      onChange={(event) =>
                        setCategory({
                          ...category,
                          categoryId: event.target.value,
                        })
                      }
                    >
                      <option value="">เลือกหมวดหมู่ที่ต้องการเพิ่ม</option>
                      {categories.data?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
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
                    หมวดหมู่หลัก
                  </label>
                  <Button
                    disabled={!category.categoryId || assign.isPending}
                    onClick={() => assign.mutate()}
                  >
                    <Plus /> {assign.isPending ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {!assigned.isLoading && !assigned.data?.length && (
            <EmptyState
              icon={<Tags className="size-6" />}
              title="ยังไม่ได้จัดหมวดหมู่"
              description="เลือกหมวดหมู่ด้านบนเพื่อช่วยให้ลูกค้าค้นหาสินค้าได้ง่ายขึ้น"
            />
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
              <CardContent className="p-5">
                <SectionIntro
                  title="เพิ่มรูปสินค้า"
                  description="รองรับ JPG, PNG และ WebP ควรใช้ภาพพื้นหลังสะอาดและเห็นสินค้าชัดเจน"
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="ไฟล์รูปภาพ" hint="ขนาดไฟล์สูงสุด 20 MB">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setUploadFile(event.target.files?.[0])
                      }
                    />
                  </FormField>
                  <FormField
                    label="คำอธิบายรูป"
                    hint="ช่วยการเข้าถึง เช่น เสื้อยืดสีดำด้านหน้า"
                  >
                    <Input
                      placeholder="คำอธิบายรูปภาพ"
                      value={image.altText}
                      onChange={(event) =>
                        setImage({ ...image, altText: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="ลำดับการแสดง">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={image.sortOrder}
                      onChange={(event) =>
                        setImage({
                          ...image,
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </FormField>
                  <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-slate-200 px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={image.isPrimary}
                      onChange={(event) =>
                        setImage({ ...image, isPrimary: event.target.checked })
                      }
                    />
                    ใช้เป็นรูปหลัก
                  </label>
                  <Button
                    className="sm:col-span-2"
                    disabled={!uploadFile || addImage.isPending}
                    onClick={() => addImage.mutate()}
                  >
                    <Plus />{" "}
                    {addImage.isPending
                      ? "กำลังอัปโหลด..."
                      : "อัปโหลดรูปสินค้า"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {!images.isLoading && !images.data?.length && (
            <EmptyState
              icon={<ImageIcon className="size-6" />}
              title="ยังไม่มีรูปสินค้า"
              description="เพิ่มอย่างน้อยหนึ่งรูปเพื่อให้สินค้าน่าสนใจและพร้อมแสดงในหน้าร้าน"
            />
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
          {!skus.isLoading && !skus.data?.length && (
            <Card className="mb-4 border-amber-300 bg-amber-50">
              <CardContent className="p-5 text-sm text-amber-900">
                Product ยังไม่มี SKU จึงยังไม่ปรากฏในหน้าปรับ Stock
                กรุณาสร้าง SKU อย่างน้อยหนึ่งรายการก่อน
              </CardContent>
            </Card>
          )}
          {writable && (
            <Card className="mb-4">
              <CardContent className="p-5">
                <SectionIntro
                  title="เพิ่มตัวเลือกสินค้า (SKU)"
                  description="SKU คือรายการที่ขายและนับสต็อกจริง เช่น เสื้อสีดำ ไซซ์ XL"
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="รหัส SKU"
                    hint="ต้องไม่ซ้ำ เช่น TSHIRT-BLK-XL"
                  >
                    <Input
                      placeholder="TSHIRT-BLK-XL"
                      value={sku.code}
                      onChange={(event) =>
                        setSku({ ...sku, code: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="บาร์โค้ด" hint="ไม่บังคับ">
                    <Input
                      placeholder="8851234567890"
                      value={sku.barcode}
                      onChange={(event) =>
                        setSku({ ...sku, barcode: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    className="sm:col-span-2"
                    label="ชื่อ SKU"
                    hint="ใช้ชื่อที่แยกตัวเลือกนี้ออกจากรายการอื่นได้ชัดเจน"
                  >
                    <Input
                      placeholder="เสื้อยืดสีดำ ไซซ์ XL"
                      value={sku.name}
                      onChange={(event) =>
                        setSku({ ...sku, name: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    className="sm:col-span-2"
                    label="คุณลักษณะสินค้า"
                    hint='รูปแบบ JSON เช่น {"color":"black","size":"XL"}'
                  >
                    <Textarea
                      className="min-h-32 font-mono"
                      value={sku.attributes}
                      onChange={(event) =>
                        setSku({ ...sku, attributes: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="sm:col-span-2 mt-1 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <CircleDollarSign className="size-5 text-blue-700" />
                      <div>
                        <h3 className="font-bold text-slate-900">
                          ราคาขายครั้งแรก
                        </h3>
                        <p className="text-xs text-slate-500">
                          เพิ่มพร้อม SKU เพื่อให้พร้อมลงสต็อกทันที
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="ราคาขาย">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={sku.amount}
                          onChange={(event) =>
                            setSku({
                              ...sku,
                              amount: Number(event.target.value),
                            })
                          }
                        />
                      </FormField>
                      <FormField label="สกุลเงิน">
                        <Input
                          maxLength={3}
                          value={sku.currency}
                          onChange={(event) =>
                            setSku({
                              ...sku,
                              currency: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      </FormField>
                      <FormField
                        className="sm:col-span-2"
                        label="เริ่มใช้ราคา"
                      >
                        <Input
                          type="datetime-local"
                          value={sku.validFrom}
                          onChange={(event) =>
                            setSku({ ...sku, validFrom: event.target.value })
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                  <Button
                    className="sm:col-span-2"
                    disabled={
                      !sku.code.trim() ||
                      !sku.name.trim() ||
                      sku.amount <= 0 ||
                      !sku.validFrom ||
                      addSku.isPending
                    }
                    onClick={() => addSku.mutate()}
                  >
                    <Plus />{" "}
                    {addSku.isPending
                      ? "กำลังเพิ่ม..."
                      : "เพิ่ม SKU และราคาขาย"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {skus.data?.map((item) => (
              <SkuPricingCard key={item.id} sku={item} writable={writable} />
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </PermissionGate>
  );
}

function SkuPricingCard({
  sku,
  writable,
}: {
  sku: Sku;
  writable: boolean;
}) {
  const queryClient = useQueryClient();
  const prices = useQuery({
    queryKey: ["skus", sku.id, "prices"],
    queryFn: () => apiFetch<Price[]>(`skus/${sku.id}/prices`),
  });
  const activePrice = currentPrice(prices.data ?? []);
  const price = activePrice ?? latestPrice(prices.data ?? []);
  const [editing, setEditing] = useState(false);
  const [priceId, setPriceId] = useState<string>();
  const [form, setForm] = useState({
    amount: 0,
    currency: "THB",
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: "",
  });
  const save = useMutation({
    mutationFn: () =>
      apiFetch<Price>(
        priceId ? `skus/${sku.id}/prices/${priceId}` : `skus/${sku.id}/prices`,
        {
          method: priceId ? "PATCH" : "POST",
          body: JSON.stringify({
            amount: form.amount,
            currency: form.currency,
            validFrom: new Date(form.validFrom).toISOString(),
            validTo: form.validTo
              ? new Date(form.validTo).toISOString()
              : undefined,
          }),
        },
      ),
    onSuccess: () => {
      toast.success(priceId ? "แก้ไขราคาขายแล้ว" : "เพิ่มราคาขายแล้ว");
      setEditing(false);
      queryClient.invalidateQueries({
        queryKey: ["skus", sku.id, "prices"],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  function startEditing() {
    setPriceId(price?.id);
    setForm({
      amount: Number(price?.amount ?? 0),
      currency: price?.currency ?? "THB",
      validFrom: toLocalDateTime(price?.validFrom ?? new Date().toISOString()),
      validTo: price?.validTo ? toLocalDateTime(price.validTo) : "",
    });
    setEditing(true);
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong>
                {sku.code} · {sku.name}
              </strong>
              <Badge value={sku.status} />
            </div>
            <small className="mt-1 block truncate text-slate-500">
              {JSON.stringify(sku.attributes)}
            </small>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 sm:min-w-56">
            {prices.isLoading ? (
              <p className="text-sm text-slate-500">กำลังโหลดราคา...</p>
            ) : price ? (
              <>
                <p className="text-xs text-slate-500">
                  {activePrice ? "ราคาที่ใช้งาน" : "ราคาล่าสุด (ยังไม่ใช้งาน)"}
                </p>
                <strong className="text-xl text-blue-700">
                  {formatCurrency(Number(price.amount), price.currency)}
                </strong>
                <p className="mt-1 text-xs text-slate-500">
                  เริ่ม {formatDateTime(price.validFrom)}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-800">ยังไม่มีราคาขาย</p>
                <p className="mt-1 text-xs text-amber-700">
                  SKU นี้ยังไม่แสดงในหน้าร้าน
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {writable && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="size-4" />
                {price ? "แก้ราคา" : "เพิ่มราคา"}
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/catalog/skus/${sku.id}`}>
                รายละเอียด <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        {editing && (
          <div className="border-t border-slate-100 bg-blue-50/50 p-4">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">
                {priceId ? "แก้ไขราคาขาย" : "เพิ่มราคาขาย"}
              </h3>
              <p className="text-sm text-slate-500">
                ตรวจช่วงเวลาไม่ให้ซ้อนกับราคาอื่นของ SKU และสกุลเงินเดียวกัน
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FormField label="ราคาขาย">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: Number(event.target.value) })
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
              <FormField label="เริ่มใช้ราคา">
                <Input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(event) =>
                    setForm({ ...form, validFrom: event.target.value })
                  }
                />
              </FormField>
              <FormField label="สิ้นสุดราคา" hint="เว้นว่างหากใช้ต่อเนื่อง">
                <Input
                  type="datetime-local"
                  value={form.validTo}
                  onChange={(event) =>
                    setForm({ ...form, validTo: event.target.value })
                  }
                />
              </FormField>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                ยกเลิก
              </Button>
              <Button
                disabled={
                  form.amount <= 0 || !form.validFrom || save.isPending
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? "กำลังบันทึก..." : "บันทึกราคา"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function currentPrice(prices: Price[]) {
  const now = Date.now();
  return [...prices].sort(
    (left, right) =>
      new Date(right.validFrom).getTime() -
      new Date(left.validFrom).getTime(),
  ).find((price) => {
    const starts = new Date(price.validFrom).getTime();
    const ends = price.validTo ? new Date(price.validTo).getTime() : Infinity;
    return starts <= now && ends >= now;
  });
}

function latestPrice(prices: Price[]) {
  return [...prices].sort(
    (left, right) =>
      new Date(right.validFrom).getTime() -
      new Date(left.validFrom).getTime(),
  )[0];
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
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
      <CardContent className="p-6">
        <SectionIntro
          title="ข้อมูลหลักของสินค้า"
          description="ชื่อและรายละเอียดส่วนนี้จะแสดงให้ผู้ดูแลระบบและลูกค้าเห็น"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="ชื่อสินค้า">
            <Input
              disabled={!writable}
              value={main.name}
              onChange={(event) =>
                setMain({ ...main, name: event.target.value })
              }
            />
          </FormField>
          <FormField
            label="สถานะ"
            hint="DRAFT ยังไม่แสดงขาย, ACTIVE พร้อมใช้งาน"
          >
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
              <option value="DRAFT">แบบร่าง (DRAFT)</option>
              <option value="ACTIVE">พร้อมใช้งาน (ACTIVE)</option>
              <option value="INACTIVE">หยุดใช้งาน (INACTIVE)</option>
            </Select>
          </FormField>
          <FormField className="sm:col-span-2" label="รายละเอียดสินค้า">
            <Textarea
              disabled={!writable}
              className="min-h-32"
              placeholder="อธิบายจุดเด่น ลักษณะสินค้า หรือข้อมูลที่ลูกค้าควรรู้"
              value={main.description}
              onChange={(event) =>
                setMain({ ...main, description: event.target.value })
              }
            />
          </FormField>
        </div>
        {writable && (
          <div className="mt-5 flex justify-end">
            <Button
              disabled={!main.name.trim() || update.isPending}
              onClick={() => update.mutate()}
            >
              {update.isPending ? "กำลังบันทึก..." : "บันทึกข้อมูลสินค้า"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductWorkflow({
  activeTab,
  skuId,
  categoryCount,
  imageCount,
  skuCount,
  onTabChange,
}: {
  activeTab: string;
  skuId?: string;
  categoryCount: number;
  imageCount: number;
  skuCount: number;
  onTabChange: (tab: string) => void;
}) {
  const steps = [
    {
      key: "overview",
      icon: <Package className="size-5" />,
      label: "1. ข้อมูลสินค้า",
      description: "ชื่อ รายละเอียด และสถานะ",
      complete: true,
    },
    {
      key: "categories",
      icon: <Tags className="size-5" />,
      label: "2. หมวดหมู่",
      description:
        categoryCount > 0 ? `${categoryCount} หมวดหมู่` : "ยังไม่ได้เลือก",
      complete: categoryCount > 0,
    },
    {
      key: "images",
      icon: <ImageIcon className="size-5" />,
      label: "3. รูปสินค้า",
      description: imageCount > 0 ? `${imageCount} รูป` : "ยังไม่มีรูป",
      complete: imageCount > 0,
    },
    {
      key: "skus",
      icon: <Boxes className="size-5" />,
      label: "4. SKU / ตัวเลือก",
      description: skuCount > 0 ? `${skuCount} SKU` : "ต้องเพิ่มก่อนลงสต็อก",
      complete: skuCount > 0,
    },
  ];

  return (
    <Card className="mb-5 overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="font-bold text-slate-950">ขั้นตอนเตรียมสินค้าให้พร้อมขาย</h2>
          <p className="mt-1 text-sm text-slate-500">
            ทำตามลำดับด้านล่าง จากนั้นกำหนดราคาและเพิ่มสต็อก
          </p>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <button
              key={step.key}
              type="button"
              onClick={() => onTabChange(step.key)}
              className={`flex items-start gap-3 bg-white p-4 text-left transition hover:bg-blue-50 ${
                activeTab === step.key ? "ring-2 ring-inset ring-blue-600" : ""
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full ${
                  step.complete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.complete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  step.icon
                )}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm text-slate-900">
                  {step.label}
                </strong>
                <small className="mt-1 block text-slate-500">
                  {step.description}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {skuId
              ? "มี SKU แล้ว ขั้นต่อไปคือกำหนดราคาและเพิ่มจำนวนสินค้าในคลัง"
              : "เพิ่ม SKU อย่างน้อยหนึ่งรายการก่อน จึงจะตั้งราคาและปรับสต็อกได้"}
          </p>
          <div className="flex flex-wrap gap-2">
            {skuId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange("skus")}
              >
                ดูหรือแก้ราคา <ChevronRight className="size-4" />
              </Button>
            )}
            {skuId ? (
              <Button asChild size="sm">
                <Link href={`/inventory/stock?skuId=${skuId}`}>
                  ไปปรับสต็อก <ChevronRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled>
                ไปปรับสต็อก
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
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
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="mb-4 border-dashed shadow-none">
      <CardContent className="flex flex-col items-center px-5 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          {icon}
        </span>
        <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
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
