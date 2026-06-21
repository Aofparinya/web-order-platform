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
  commonRead: "common.read",
  commonWrite: "common.write",
  storageRead: "storage.read",
  storageWrite: "storage.write",
  notificationsRead: "notifications.read",
  notificationsWrite: "notifications.write",
  notificationTemplatesRead: "notification-templates.read",
  notificationTemplatesWrite: "notification-templates.write",
  auditRead: "audit.read",
  reportsRead: "reports.read",
  reportsExport: "reports.export",
} as const;

export function isAdmin(user?: AuthUser | null) {
  return user?.roles.includes("ADMIN") ?? false;
}

export function can(user: AuthUser | null | undefined, permission: string) {
  return isAdmin(user) || (user?.permissions.includes(permission) ?? false);
}

export function homeRoute(user: AuthUser | null | undefined) {
  return isAdmin(user) ? "/dashboard" : "/store";
}
