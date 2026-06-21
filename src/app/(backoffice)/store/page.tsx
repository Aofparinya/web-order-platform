"use client";

import { useQuery } from "@tanstack/react-query";
import {
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
  });

  const selectedWarehouseId =
    warehouseId || catalog.data?.selectedWarehouseId || "";

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
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
            Order Market
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl">
            เลือกสินค้าที่มีพร้อมขายจากคลัง
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            ราคาและจำนวนคงเหลืออ้างอิงจาก Catalog และ Inventory Service
            แบบปัจจุบัน ก่อนยืนยันคำสั่งซื้อระบบจะตรวจสต็อกอีกครั้ง
          </p>
        </div>
        <div className="mt-7 grid gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur sm:grid-cols-[1fr_320px]">
          <label className="relative">
            <Search className="absolute left-3 top-3 size-5 text-slate-400" />
            <Input
              className="h-11 border-white/20 bg-white pl-10 text-slate-950"
              placeholder="ค้นหาชื่อสินค้า เลขสินค้า หรือ SKU"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Select
            className="h-11 border-white/20"
            value={selectedWarehouseId}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            {(catalog.data?.warehouses ?? []).map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} · {warehouse.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">สินค้าพร้อมขาย</h2>
          <p className="mt-1 text-sm text-slate-500">
            พบ {formatNumber(products.length)} รายการในคลังที่เลือก
          </p>
        </div>
        <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
          <Warehouse className="size-4" />
          สต็อกแยกตามคลัง
        </div>
      </div>

      {catalog.isLoading && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-96 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      )}

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

      {!catalog.isLoading && !catalog.isError && products.length === 0 && (
        <Card className="mt-6">
          <CardContent className="py-16 text-center">
            <Boxes className="mx-auto size-11 text-slate-400" />
            <h3 className="mt-3 font-bold">ยังไม่มีสินค้าพร้อมขายในคลังนี้</h3>
            <p className="mt-1 text-sm text-slate-500">
              ผู้ดูแลระบบสามารถเพิ่มราคาและปรับสต็อกได้จาก Back Office
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            warehouseId={selectedWarehouseId}
            warehouseName={
              catalog.data?.warehouses.find(
                (warehouse) =>
                  warehouse.id ===
                  selectedWarehouseId,
              )?.name ?? ""
            }
          />
        ))}
      </div>
    </>
  );
}

function ProductCard({
  product,
  warehouseId,
  warehouseName,
}: {
  product: StorefrontProduct;
  warehouseId: string;
  warehouseName: string;
}) {
  const { addItem } = useCart();
  const [skuId, setSkuId] = useState(product.skus[0]?.id ?? "");
  const sku =
    product.skus.find((item) => item.id === skuId) ?? product.skus[0];
  const add = () => {
    if (!sku || sku.available < 1) return;
    const added = addItem({
      skuId: sku.id,
      productId: product.id,
      productName: product.name,
      skuName: sku.name,
      skuCode: sku.code,
      imageUrl: product.imageUrl,
      warehouseId,
      warehouseName,
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
    <Card className="overflow-hidden rounded-2xl">
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
      <CardContent className="p-5">
        <p className="text-xs font-semibold text-blue-600">
          {product.productNo}
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-950">
          {product.name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">
          {product.description || "สินค้าพร้อมจำหน่ายจากคลังที่เลือก"}
        </p>
        <Select
          className="mt-4"
          value={sku?.id}
          onChange={(event) => setSkuId(event.target.value)}
        >
          {product.skus.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </Select>
        {sku && <SkuSummary sku={sku} />}
        <Button
          className="mt-4 w-full"
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

function SkuSummary({ sku }: { sku: StorefrontSku }) {
  return (
    <div className="mt-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-xl font-bold text-slate-950">
          {formatCurrency(sku.price, sku.currency)}
        </p>
        <p className="text-xs text-slate-500">
          คงเหลือ {formatNumber(sku.available)} ชิ้น
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          sku.available > 0
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {sku.available > 0 ? "พร้อมขาย" : "หมด"}
      </span>
    </div>
  );
}
