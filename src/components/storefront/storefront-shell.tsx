"use client";

import {
  Bell,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  UserCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/storefront/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/api";

const links = [
  { href: "/store", label: "เลือกซื้อสินค้า", icon: ShoppingBag },
  { href: "/store/orders", label: "คำสั่งซื้อของฉัน", icon: ReceiptText },
  { href: "/profile", label: "บัญชีของฉัน", icon: UserCircle },
];

export function StorefrontShell({
  user,
  unreadCount,
  onLogout,
  children,
}: {
  user: AuthUser;
  unreadCount: number;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/store" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-blue-600 text-white">
              <PackageSearch className="size-5" />
            </span>
            <span>
              <strong className="block text-slate-950">Order Market</strong>
              <small className="text-slate-500">สินค้าในคลังพร้อมขาย</small>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((item) => (
              <StoreLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  pathname === item.href ||
                  (item.href !== "/store" &&
                    pathname.startsWith(`${item.href}/`))
                }
              />
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/notifications" aria-label="การแจ้งเตือน">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <Counter value={Math.min(unreadCount, 99)} />
                )}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/store/cart" aria-label="ตะกร้าสินค้า">
                <ShoppingCart className="size-5" />
                {count > 0 && <Counter value={Math.min(count, 99)} />}
              </Link>
            </Button>
            <div className="hidden px-3 text-right sm:block">
              <strong className="block text-sm text-slate-900">
                {user.firstName} {user.lastName}
              </strong>
              <small className="text-slate-500">{user.email}</small>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              title="ออกจากระบบ"
            >
              <LogOut className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 bg-slate-950/40"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-80 bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <strong>เมนูสมาชิก</strong>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <nav className="grid gap-2">
              {links.map((item) => (
                <StoreLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={
                    pathname === item.href ||
                    (item.href !== "/store" &&
                      pathname.startsWith(`${item.href}/`))
                  }
                  onClick={() => setOpen(false)}
                />
              ))}
              <StoreLink
                href="/store/cart"
                label={`ตะกร้าสินค้า (${count})`}
                icon={ShoppingCart}
                active={pathname.startsWith("/store/cart")}
                onClick={() => setOpen(false)}
              />
            </nav>
          </aside>
        </>
      )}

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

function StoreLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof ShoppingBag;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function Counter({ value }: { value: number }) {
  return (
    <span className="absolute right-0 top-0 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">
      {value}
    </span>
  );
}
