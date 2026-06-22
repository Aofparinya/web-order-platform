"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Boxes,
  ImageIcon,
  PackageSearch,
  Search,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/components/storefront/cart-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  StorefrontCatalog,
  StorefrontProduct,
  StorefrontSku,
} from "@/types/storefront";

export default function StorePage() {
  const [warehouseId, setWarehouseId] = useState("");
  const [query, setQuery] = useState("");
  const catalog = useQuery({
    queryKey: ["storefront-catalog", warehouseId],
    queryFn: () =>
      apiFetch<StorefrontCatalog>(
        `/api/store/catalog${warehouseId ? `?warehouseId=${warehouseId}` : ""}`,
      ),
    placeholderData: (previousData) => previousData,
  });

  const selectedWarehouseId = warehouseId;
  const selectedWarehouse = catalog.data?.warehouses.find(
    (warehouse) => warehouse.id === selectedWarehouseId,
  );
  const showCatalogSkeleton = catalog.isPending || catalog.isPlaceholderData;

  const products = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return catalog.data?.products ?? [];
    return (catalog.data?.products ?? []).filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.productNo.toLowerCase().includes(keyword) ||
        product.skus.some(
          (sku) =>
            sku.code.toLowerCase().includes(keyword) ||
            sku.name.toLowerCase().includes(keyword),
        ),
    );
  }, [catalog.data?.products, query]);

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-9 text-white shadow-xl shadow-slate-950/10 sm:px-10 sm:py-11">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
            Order Market
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">
            เลือกสินค้าที่พร้อมส่ง
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            เริ่มต้นด้วยสินค้าจากทุกคลัง หรือเลือกคลังที่สะดวก
            ระบบจะแสดงราคาและจำนวนคงเหลือล่าสุดให้โดยอัตโนมัติ
          </p>
        </div>
        <div className="mt-7 grid gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur md:grid-cols-[1fr_340px]">
          <label>
            <span className="mb-2 block text-sm font-semibold text-slate-200">
              ค้นหาสินค้า
            </span>
            <span className="relative block">
              <Search className="absolute left-3 top-3 size-5 text-slate-400" />
            <Input
              className="h-11 border-white/20 bg-white pl-10 text-slate-950"
              placeholder="ค้นหาชื่อสินค้า เลขสินค้า หรือ SKU"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            </span>
          </label>
          <label>
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Warehouse className="size-4" /> เลือกคลังสินค้า
            </span>
            <Select
              className="h-11 border-white/20 bg-white text-slate-950"
              value={selectedWarehouseId}
              disabled={catalog.isPending}
              onChange={(event) => setWarehouseId(event.target.value)}
            >
              <option value="">ทุกคลังสินค้า</option>
              {(catalog.data?.warehouses ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <span className="size-2 rounded-full bg-emerald-400" />
          {selectedWarehouse
            ? `กำลังแสดงสินค้าจาก ${selectedWarehouse.name}`
            : "กำลังแสดงสินค้าที่มีสต็อกจากทุกคลัง"}
        </p>
      </section>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            {selectedWarehouseId ? "สินค้าในคลังนี้" : "สินค้าทั้งหมด"}
          </h2>
          {showCatalogSkeleton ? (
            <Skeleton className="mt-2 h-4 w-40" />
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              พบ {formatNumber(products.length)} รายการ
              {selectedWarehouse
                ? ` ใน ${selectedWarehouse.name}`
                : " จากทุกคลัง"}
            </p>
          )}
        </div>
        <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
          <Warehouse className="size-4" />
          สต็อกแยกตามคลัง
        </div>
      </div>

      {showCatalogSkeleton && <StorefrontCatalogSkeleton />}

      {catalog.isError && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardContent className="py-10 text-center">
            <PackageSearch className="mx-auto size-10 text-red-500" />
            <h3 className="mt-3 font-bold text-red-900">
              ไม่สามารถโหลดสินค้าได้
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {catalog.error.message}
            </p>
            <Button className="mt-4" onClick={() => catalog.refetch()}>
              โหลดใหม่
            </Button>
          </CardContent>
        </Card>
      )}

      {!showCatalogSkeleton && !catalog.isError && products.length === 0 && (
        <Card className="mt-6">
          <CardContent className="py-16 text-center">
            <Boxes className="mx-auto size-11 text-slate-400" />
            <h3 className="mt-3 font-bold">ยังไม่มีสินค้าพร้อมขายในคลังนี้</h3>
            <p className="mt-1 text-sm text-slate-500">
              ลองเลือกทุกคลัง หรือล้างคำค้นหาเพื่อดูสินค้ารายการอื่น
            </p>
          </CardContent>
        </Card>
      )}

      {!showCatalogSkeleton && !catalog.isError && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={`${selectedWarehouseId || "all"}:${product.id}`}
              product={product}
              showWarehouse={!selectedWarehouseId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ProductCard({
  product,
  showWarehouse,
}: {
  product: StorefrontProduct;
  showWarehouse: boolean;
}) {
  const { addItem } = useCart();
  const [selectedSkuId, setSelectedSkuId] = useState(
    product.skus[0]?.id ?? "",
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.skus[0]?.warehouseId ?? "",
  );
  const skuOptions = Array.from(
    new Map(product.skus.map((item) => [item.id, item])).values(),
  );
  const warehouseOptions = product.skus.filter(
    (item) => item.id === selectedSkuId,
  );
  const sku =
    product.skus.find(
      (item) =>
        item.id === selectedSkuId &&
        item.warehouseId === selectedWarehouseId,
    ) ??
    warehouseOptions[0] ??
    product.skus[0];
  const add = () => {
    if (!sku || sku.available < 1) return;
    const added = addItem({
      skuId: sku.id,
      productId: product.id,
      productName: product.name,
      skuName: sku.name,
      skuCode: sku.code,
      imageUrl: product.imageUrl,
      warehouseId: sku.warehouseId,
      warehouseName: sku.warehouseName,
      price: sku.price,
      currency: sku.currency,
      available: sku.available,
      quantity: 1,
    });
    if (!added) {
      toast.error(
        "ตะกร้ามีสินค้าจากคลังอื่น กรุณาล้างตะกร้าก่อนเปลี่ยนคลัง",
      );
      return;
    }
    toast.success(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`);
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="grid aspect-[16/10] place-items-center bg-slate-100">
        {product.imageUrl ? (
          <div
            role="img"
            aria-label={product.name}
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url("${product.imageUrl}")` }}
          />
        ) : (
          <ImageIcon className="size-12 text-slate-300" />
        )}
      </div>
      <CardContent className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold text-blue-600">
          {product.productNo}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          ชื่อสินค้า
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-950">
          {product.name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">
          {product.description || "สินค้าพร้อมจำหน่ายจากคลังที่เลือก"}
        </p>
        <div className="mt-5 grid gap-4">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              ตัวเลือกสินค้า
            </span>
            <Select
              value={selectedSkuId}
              onChange={(event) => {
                const nextSkuId = event.target.value;
                const firstWarehouse = product.skus.find(
                  (item) => item.id === nextSkuId,
                );
                setSelectedSkuId(nextSkuId);
                setSelectedWarehouseId(firstWarehouse?.warehouseId ?? "");
              }}
            >
              {skuOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              คลังสินค้า
            </span>
            {showWarehouse && warehouseOptions.length > 1 ? (
              <Select
                value={sku?.warehouseId ?? selectedWarehouseId}
                onChange={(event) =>
                  setSelectedWarehouseId(event.target.value)
                }
              >
                {warehouseOptions.map((item) => (
                  <option key={item.warehouseId} value={item.warehouseId}>
                    {item.warehouseName}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800">
                <Warehouse className="size-4 text-blue-600" />
                {sku?.warehouseName ?? "ไม่พบคลังสินค้า"}
              </div>
            )}
          </label>
        </div>
        {sku && <SkuSummary sku={sku} />}
        <Button
          className="mt-5 w-full"
          disabled={!sku || sku.available < 1}
          onClick={add}
        >
          <ShoppingCart />
          {sku?.available ? "เพิ่มลงตะกร้า" : "สินค้าหมด"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StorefrontCatalogSkeleton() {
  return (
    <div
      className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="กำลังโหลดสินค้า"
      role="status"
    >
      {[0, 1, 2].map((item) => (
        <Card key={item} className="overflow-hidden rounded-2xl">
          <Skeleton className="aspect-[16/10] rounded-none" />
          <CardContent className="p-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-5 h-10 w-full" />
            <Skeleton className="mt-4 h-10 w-full" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SkuSummary({ sku }: { sku: StorefrontSku }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Boxes className="size-4 text-blue-600" />
          สินค้าคงเหลือ
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <strong
            className={`text-xl ${
              sku.available > 0 ? "text-slate-950" : "text-slate-400"
            }`}
          >
            {formatNumber(sku.available)}
          </strong>
          <span
            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
              sku.available > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {sku.available > 0 ? "พร้อมขาย" : "หมด"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">หน่วย: ชิ้น</p>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Banknote className="size-4 text-blue-600" />
          จำนวนเงิน
        </div>
        <strong className="mt-2 block text-xl text-blue-700">
          {formatCurrency(sku.price, sku.currency)}
        </strong>
        <p className="mt-1 text-xs text-slate-500">ราคาต่อชิ้น</p>
      </div>
    </div>
  );
}
