import "server-only";

import { gatewayFetch, forwardWithSession } from "@/lib/server/gateway";
import type {
  AuthUser,
  Customer,
  CustomerAddress,
  CustomerContact,
  Order,
  OrderPayment,
  OrderPaymentCheckout,
  Page,
  Price,
  Product,
  ProductImage,
  Sku,
  Stock,
  ThaiDistrict,
  ThaiLocation,
  ThaiProvince,
  ThaiSubdistrict,
  Warehouse,
} from "@/types/api";
import type {
  StorefrontAddressInput,
  StorefrontCatalog,
  StorefrontCheckoutInput,
  StorefrontCheckoutResult,
  StorefrontPaymentCheckout,
  StorefrontProduct,
} from "@/types/storefront";

interface ServiceToken {
  accessToken: string;
  expiresIn: number;
}

interface DownloadUrl {
  url: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export class StorefrontError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function currentStorefrontUser(): Promise<AuthUser> {
  const response = await forwardWithSession("auth/me");
  if (!response.ok) {
    throw new StorefrontError(response.status, "กรุณาเข้าสู่ระบบ");
  }
  const user = (await response.json()) as AuthUser;
  if (user.roles.includes("ADMIN")) {
    throw new StorefrontError(403, "บัญชีผู้ดูแลระบบใช้เมนู Back Office");
  }
  return user;
}

async function serviceToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  const clientId = process.env.STOREFRONT_CLIENT_ID ?? "web-storefront";
  const clientSecret =
    process.env.STOREFRONT_CLIENT_SECRET ??
    "development-web-storefront-secret-change-me";
  const response = await gatewayFetch("auth/service-token", {
    method: "POST",
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!response.ok) {
    throw new StorefrontError(
      503,
      "Storefront service client ยังไม่พร้อมใช้งาน",
    );
  }
  const token = (await response.json()) as ServiceToken;
  cachedToken = {
    value: token.accessToken,
    expiresAt: Date.now() + Math.max(token.expiresIn - 30, 30) * 1000,
  };
  return token.accessToken;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await gatewayFetch(path, init, await serviceToken());
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new StorefrontError(
      response.status,
      body?.message ?? "ไม่สามารถเชื่อมต่อบริการ Storefront ได้",
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function optionalRequest<T>(path: string): Promise<T | null> {
  const response = await gatewayFetch(path, {}, await serviceToken());
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new StorefrontError(
      response.status,
      body?.message ?? "ไม่สามารถโหลดข้อมูลได้",
    );
  }
  return (await response.json()) as T;
}

export async function storefrontCatalog(
  requestedWarehouseId?: string,
): Promise<StorefrontCatalog> {
  const [productPage, allWarehouses] = await Promise.all([
    request<Page<Product>>("products?page=1&pageSize=100&status=ACTIVE"),
    request<Warehouse[]>("warehouses"),
  ]);
  const warehouses = allWarehouses.filter(
    (warehouse) => warehouse.status === "ACTIVE",
  );
  const selectedWarehouseId =
    warehouses.find((warehouse) => warehouse.id === requestedWarehouseId)?.id ??
    "";
  if (!warehouses.length) {
    return { warehouses, selectedWarehouseId: "", products: [] };
  }

  const visibleWarehouses = selectedWarehouseId
    ? warehouses.filter((warehouse) => warehouse.id === selectedWarehouseId)
    : warehouses;
  const stockPages = await Promise.all(
    visibleWarehouses.map((warehouse) => inventoryForWarehouse(warehouse.id)),
  );
  const stocks = stockPages.flat();
  const stockByWarehouseAndSku = new Map(
    stocks.map((stock) => [`${stock.warehouseId}:${stock.skuId}`, stock]),
  );

  const products = await Promise.all(
    productPage.data.map(async (product): Promise<StorefrontProduct | null> => {
      const [allSkus, images] = await Promise.all([
        request<Sku[]>(`products/${product.id}/skus`),
        request<ProductImage[]>(`products/${product.id}/images`),
      ]);
      const activeSkus = allSkus.filter((sku) => sku.status === "ACTIVE");
      const skus = (
        await Promise.all(
          activeSkus.map(async (sku) => {
            const prices = await request<Price[]>(`skus/${sku.id}/prices`);
            const price = currentPrice(prices);
            if (!price) return null;
            const warehouseSkus = visibleWarehouses
              .map((warehouse) => {
                const stock = stockByWarehouseAndSku.get(
                  `${warehouse.id}:${sku.id}`,
                );
                if (!selectedWarehouseId && !stock) return null;
                return {
                  id: sku.id,
                  warehouseId: warehouse.id,
                  warehouseName: warehouse.name,
                  code: sku.code,
                  name: sku.name,
                  attributes: sku.attributes,
                  price: Number(price.amount),
                  currency: price.currency,
                  available: Math.max(stock?.available ?? 0, 0),
                };
              })
              .filter((item) => item !== null);
            if (
              !selectedWarehouseId &&
              warehouseSkus.length === 0 &&
              visibleWarehouses[0]
            ) {
              return [
                {
                  id: sku.id,
                  warehouseId: visibleWarehouses[0].id,
                  warehouseName: visibleWarehouses[0].name,
                  code: sku.code,
                  name: sku.name,
                  attributes: sku.attributes,
                  price: Number(price.amount),
                  currency: price.currency,
                  available: 0,
                },
              ];
            }
            return warehouseSkus;
          }),
        )
      )
        .filter((items) => items !== null)
        .flat();
      if (!skus.length) return null;

      const primaryImage =
        images.find((image) => image.isPrimary) ??
        [...images].sort((left, right) => left.sortOrder - right.sortOrder)[0];
      let imageUrl: string | undefined;
      if (primaryImage) {
        try {
          imageUrl = (
            await request<DownloadUrl>(
              `files/${primaryImage.fileId}/download-url?inline=true`,
            )
          ).url;
        } catch {
          imageUrl = undefined;
        }
      }
      return {
        id: product.id,
        productNo: product.productNo,
        name: product.name,
        description: product.description,
        imageUrl,
        skus,
      };
    }),
  );

  return {
    warehouses,
    selectedWarehouseId,
    products: products.filter((product) => product !== null),
  };
}

async function inventoryForWarehouse(warehouseId: string): Promise<Stock[]> {
  const path = `inventory?warehouseId=${encodeURIComponent(warehouseId)}&pageSize=100`;
  const firstPage = await request<Page<Stock>>(`${path}&page=1`);
  if (firstPage.pagination.totalPages <= 1) return firstPage.data;
  const remainingPages = await Promise.all(
    Array.from(
      { length: firstPage.pagination.totalPages - 1 },
      (_, index) => request<Page<Stock>>(`${path}&page=${index + 2}`),
    ),
  );
  return [
    ...firstPage.data,
    ...remainingPages.flatMap((page) => page.data),
  ];
}

function currentPrice(prices: Price[]): Price | undefined {
  const now = Date.now();
  return prices
    .filter((price) => {
      const starts = new Date(price.validFrom).getTime();
      const ends = price.validTo ? new Date(price.validTo).getTime() : Infinity;
      return starts <= now && ends >= now;
    })
    .sort(
      (left, right) =>
        new Date(right.validFrom).getTime() -
        new Date(left.validFrom).getTime(),
    )[0];
}

export async function storefrontOrders(user: AuthUser) {
  return request<Page<Order>>(
    `orders?customerId=${encodeURIComponent(user.id)}&page=1&pageSize=50`,
  );
}

export async function storefrontLocations(
  level: string,
  searchParams: URLSearchParams,
): Promise<ThaiProvince[] | ThaiDistrict[] | ThaiSubdistrict[] | ThaiLocation[]> {
  if (!["provinces", "districts", "subdistricts", "search"].includes(level)) {
    throw new StorefrontError(404, "ไม่พบประเภทข้อมูลที่อยู่");
  }
  const query = searchParams.toString();
  return request(`locations/${level}${query ? `?${query}` : ""}`);
}

export async function storefrontPaymentCheckout(
  user: AuthUser,
  paymentId: string,
): Promise<StorefrontPaymentCheckout> {
  const payment = await request<OrderPaymentCheckout>(
    `payments/${paymentId}/checkout`,
  );
  const order = await request<Order>(`orders/${payment.orderId}`);
  assertOrderOwner(order, user);
  return {
    ...payment,
    order,
    customerEmail: user.email,
  };
}

export async function retryStorefrontPayment(
  user: AuthUser,
  paymentId: string,
): Promise<OrderPayment> {
  const payment = await request<OrderPayment>(`payments/${paymentId}`);
  const order = await request<Order>(`orders/${payment.orderId}`);
  assertOrderOwner(order, user);
  try {
    return await request<OrderPayment>(
      `payments/${paymentId}/retry-checkout`,
      {
        method: "POST",
        headers: { "idempotency-key": `storefront-retry:${paymentId}` },
        body: JSON.stringify({}),
      },
    );
  } catch (error) {
    if (error instanceof StorefrontError && error.status === 404) {
      throw new StorefrontError(
        503,
        "Order Service ยังไม่ได้ deploy รุ่นที่รองรับ Stripe Checkout ใหม่ กรุณาตั้งค่า Stripe และรัน scripts/start-stripe-local.ps1",
      );
    }
    throw error;
  }
}

export async function checkout(
  user: AuthUser,
  input: StorefrontCheckoutInput,
  idempotencyKey: string,
): Promise<StorefrontCheckoutResult> {
  await ensureCustomer(user);
  const existingAddresses = await request<CustomerAddress[]>(
    `customers/${user.id}/addresses`,
  );
  const billingAddress = await ensureAddress(
    user.id,
    "BILLING",
    input.billingAddress,
    existingAddresses,
  );
  const shippingAddress = await ensureAddress(
    user.id,
    "SHIPPING",
    input.shippingAddress,
    existingAddresses,
  );

  const order = await request<Order>("orders", {
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      customerId: user.id,
      warehouseId: input.warehouseId,
      billingAddressId: billingAddress.id,
      shippingAddressId: shippingAddress.id,
      items: input.items,
      note: `Storefront order by ${user.email}`,
    }),
  });
  const submitted = await request<Order>(`orders/${order.id}/submit`, {
    method: "POST",
    headers: { "idempotency-key": `${idempotencyKey}:submit` },
    body: JSON.stringify({ version: order.version }),
  });
  const payment = await request<OrderPayment>(
    `orders/${submitted.id}/payments`,
    {
      method: "POST",
      headers: { "idempotency-key": `${idempotencyKey}:payment` },
      body: JSON.stringify({}),
    },
  );
  return {
    order: submitted,
    checkoutUrl: payment.checkoutUrl,
    paymentId: payment.id,
  };
}

function assertOrderOwner(order: Order, user: AuthUser) {
  if (order.customerId !== user.id) {
    throw new StorefrontError(404, "ไม่พบรายการชำระเงิน");
  }
}

async function ensureCustomer(user: AuthUser): Promise<Customer> {
  let customer = await optionalRequest<Customer>(`customers/${user.id}`);
  if (!customer) {
    customer = await request<Customer>("customers", {
      method: "POST",
      body: JSON.stringify({
        id: user.id,
        customerType: "INDIVIDUAL",
        status: "ACTIVE",
        firstName: user.firstName,
        lastName: user.lastName,
        note: "Created automatically by Storefront",
      }),
    });
  }
  const contacts = await request<CustomerContact[]>(
    `customers/${customer.id}/contacts`,
  );
  if (
    !contacts.some(
      (contact) => contact.email?.toLowerCase() === user.email.toLowerCase(),
    )
  ) {
    await request<CustomerContact>(`customers/${customer.id}/contacts`, {
      method: "POST",
      body: JSON.stringify({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isPrimary: true,
      }),
    });
  }
  return customer;
}

async function ensureAddress(
  customerId: string,
  addressType: "BILLING" | "SHIPPING",
  input: StorefrontAddressInput,
  existing: CustomerAddress[],
): Promise<CustomerAddress> {
  const matched = existing.find(
    (address) =>
      address.addressType === addressType &&
      address.line1 === input.line1 &&
      (address.line2 ?? "") === (input.line2 ?? "") &&
      (address.subdistrict ?? "") === (input.subdistrict ?? "") &&
      (address.district ?? "") === (input.district ?? "") &&
      address.province === input.province &&
      address.postalCode === input.postalCode &&
      address.countryCode.toUpperCase() === input.countryCode.toUpperCase(),
  );
  if (matched) return matched;
  return request<CustomerAddress>(`customers/${customerId}/addresses`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      addressType,
      countryCode: input.countryCode.toUpperCase(),
      isDefault: true,
    }),
  });
}
