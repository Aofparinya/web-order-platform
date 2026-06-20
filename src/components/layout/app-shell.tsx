"use client";

import {
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  ShieldCheck,
  Tags,
  UserCircle,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { can, isAdmin, permissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "ภาพรวม", icon: Gauge, show: () => true },
  {
    href: "/users",
    label: "ผู้ใช้งาน",
    icon: ShieldCheck,
    show: isAdmin,
  },
  {
    href: "/customers",
    label: "ลูกค้า",
    icon: Users,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.customersRead),
  },
  {
    href: "/catalog/categories",
    label: "หมวดหมู่",
    icon: Tags,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.catalogRead),
  },
  {
    href: "/catalog/products",
    label: "สินค้า",
    icon: Package,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.catalogRead),
  },
  {
    href: "/inventory/warehouses",
    label: "คลังสินค้า",
    icon: Building2,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.inventoryRead),
  },
  {
    href: "/inventory/stock",
    label: "สต็อก",
    icon: Warehouse,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.inventoryRead),
  },
  {
    href: "/inventory/movements",
    label: "ความเคลื่อนไหว",
    icon: ClipboardList,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.inventoryRead),
  },
  {
    href: "/inventory/reservations",
    label: "การจองสต็อก",
    icon: Boxes,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.inventoryRead),
  },
  {
    href: "/orders",
    label: "คำสั่งซื้อ",
    icon: ShoppingCart,
    show: (user: Parameters<typeof can>[0]) =>
      can(user, permissions.ordersRead),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await apiFetch<void>("/api/session/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ออกจากระบบไม่สำเร็จ");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }
  if (!user) return null;

  const links = navigation.filter((item) => item.show(user));
  return (
    <div className="min-h-screen">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-800 bg-slate-950 text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-600">
              <Boxes className="size-5" />
            </span>
            <span>
              <strong className="block">Order Platform</strong>
              <small className="text-slate-400">Back Office</small>
            </span>
          </Link>
          <button
            className="lg:hidden"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {links.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="เปิดเมนู"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <div className="hidden text-sm text-slate-500 sm:block">
            ระบบบริหารจัดการองค์กร
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <UserCircle className="size-8 text-slate-500" />
              <span className="hidden text-left sm:block">
                <strong className="block text-sm text-slate-900">
                  {user.firstName} {user.lastName}
                </strong>
                <small className="text-slate-500">{user.email}</small>
              </span>
              <ChevronDown className="size-4 text-slate-400" />
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} title="ออกจากระบบ">
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
