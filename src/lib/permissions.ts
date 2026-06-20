import type { AuthUser } from "@/types/api";

export const permissions = {
  customersRead: "customers.read",
  customersWrite: "customers.write",
  catalogRead: "catalog.read",
  catalogWrite: "catalog.write",
  inventoryRead: "inventory.read",
  inventoryWrite: "inventory.write",
  ordersRead: "orders.read",
  ordersWrite: "orders.write",
  paymentsRead: "payments.read",
  paymentsWrite: "payments.write",
  invoicesRead: "invoices.read",
  refundsRead: "refunds.read",
  refundsWrite: "refunds.write",
} as const;

export function isAdmin(user?: AuthUser | null) {
  return user?.roles.includes("ADMIN") ?? false;
}

export function can(user: AuthUser | null | undefined, permission: string) {
  return isAdmin(user) || (user?.permissions.includes(permission) ?? false);
}
