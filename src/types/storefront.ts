import type {
  Order,
  OrderPayment,
  OrderPaymentCheckout,
  Page,
  Warehouse,
} from "@/types/api";

export interface StorefrontSku {
  id: string;
  code: string;
  name: string;
  attributes: Record<string, unknown>;
  price: number;
  currency: string;
  available: number;
}

export interface StorefrontProduct {
  id: string;
  productNo: string;
  name: string;
  description?: string;
  imageUrl?: string;
  skus: StorefrontSku[];
}

export interface StorefrontCatalog {
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  products: StorefrontProduct[];
}

export interface StorefrontOrders {
  orders: Page<Order>;
}

export interface StorefrontCheckoutResult {
  order: Order;
  checkoutUrl?: string;
  paymentId?: string;
}

export interface StorefrontPaymentCheckout extends OrderPaymentCheckout {
  order: Order;
  customerEmail: string;
}

export interface StorefrontPaymentRetry {
  payment: OrderPayment;
}

export interface StorefrontAddressInput {
  line1: string;
  line2?: string;
  subdistrict?: string;
  district?: string;
  province: string;
  postalCode: string;
  countryCode: string;
}

export interface StorefrontCheckoutInput {
  warehouseId: string;
  items: Array<{ skuId: string; quantity: number }>;
  billingAddress: StorefrontAddressInput;
  shippingAddress: StorefrontAddressInput;
}
