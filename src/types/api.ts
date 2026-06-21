export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}

export interface UserSummary extends Omit<AuthUser, "permissions"> {
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  rolePermissions: Array<{ permission: Permission }>;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export interface Customer {
  id: string;
  customerNo: string;
  customerType: "INDIVIDUAL" | "CORPORATE";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  registrationNumber?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: "BILLING" | "SHIPPING" | "CONTACT";
  line1: string;
  line2?: string;
  subdistrict?: string;
  district?: string;
  province: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

export interface ThaiProvince {
  code: number;
  nameTh: string;
  nameEn: string;
  regionCode: number;
}

export interface ThaiDistrict {
  code: number;
  provinceCode: number;
  nameTh: string;
  nameEn: string;
}

export interface ThaiSubdistrict {
  code: number;
  districtCode: number;
  provinceCode: number;
  nameTh: string;
  nameEn: string;
  postalCode: string;
}

export interface ThaiLocation {
  provinceCode: number;
  provinceNameTh: string;
  provinceNameEn: string;
  districtCode: number;
  districtNameTh: string;
  districtNameEn: string;
  subdistrictCode: number;
  subdistrictNameTh: string;
  subdistrictNameEn: string;
  postalCode: string;
}

export interface CustomerContact {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface TaxProfile {
  id: string;
  customerId: string;
  taxId: string;
  branchType: "HEAD_OFFICE" | "BRANCH";
  branchCode: string;
  branchName?: string;
  addressLine1: string;
  addressLine2?: string;
  subdistrict?: string;
  district?: string;
  province: string;
  postalCode: string;
  countryCode: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productNo: string;
  name: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  productId: string;
  categoryId: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  fileId: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Sku {
  id: string;
  productId: string;
  code: string;
  barcode?: string;
  name: string;
  attributes: Record<string, unknown>;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Price {
  id: string;
  skuId: string;
  amount: string | number;
  currency: string;
  validFrom: string;
  validTo?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface Stock {
  warehouseId: string;
  skuId: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  skuId: string;
  movementType: string;
  onHandChange: number;
  reservedChange: number;
  onHandAfter: number;
  reservedAfter: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdAt: string;
}

export interface ReservationItem {
  skuId: string;
  quantity: number;
}

export interface Reservation {
  id: string;
  warehouseId: string;
  referenceType: string;
  referenceId: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";
  expiresAt: string;
  confirmedAt?: string;
  releasedAt?: string;
  items: ReservationItem[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLATION_PENDING"
  | "CANCELLED"
  | "EXPIRED"
  | "REVIEW_REQUIRED";

export interface OrderItem {
  id: string;
  skuId: string;
  productId: string;
  skuCode: string;
  skuName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  paymentNumber: string;
  status:
    | "PENDING"
    | "CHECKOUT_OPEN"
    | "AUTHORIZED"
    | "CAPTURE_PENDING"
    | "CAPTURED"
    | "FAILED"
    | "VOID_PENDING"
    | "VOIDED"
    | "EXPIRED";
  amount: number;
  currency: string;
  checkoutUrl?: string;
  checkoutExpiresAt?: string;
  providerPaymentIntentId?: string;
  createdAt: string;
}

export interface OrderPaymentCheckout {
  paymentId: string;
  orderId: string;
  paymentNumber: string;
  status: OrderPayment["status"];
  amount: number;
  currency: string;
  mode: "stripe" | "retry_required";
  publishableKey?: string;
  clientSecret?: string;
  expiresAt?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  customerSnapshotJson: string;
  billingAddressSnapshotJson: string;
  taxProfileSnapshotJson?: string;
  issuedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  refundNumber: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  amount: number;
  currency: string;
  reason: string;
  providerRefundId?: string;
  createdAt: string;
}

export interface OrderHistory {
  id: string;
  fromStatus?: string;
  toStatus: string;
  reason: string;
  actorId: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: OrderStatus;
  currency: string;
  discountType: "NONE" | "PERCENT" | "FIXED";
  discountValue: number;
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  refundedAmount: number;
  reservationId?: string;
  reservationExpiresAt?: string;
  customerSnapshotJson: string;
  billingAddressSnapshotJson: string;
  shippingAddressSnapshotJson: string;
  taxProfileSnapshotJson?: string;
  note?: string;
  version: number;
  items: OrderItem[];
  payments: OrderPayment[];
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}
