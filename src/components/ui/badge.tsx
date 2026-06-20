import * as React from "react";
import { cn } from "@/lib/utils";
import { enumLabel } from "@/lib/labels";

const colors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-500/20",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-500/20",
  RELEASED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  BLOCKED: "bg-red-50 text-red-700 ring-red-600/20",
  EXPIRED: "bg-red-50 text-red-700 ring-red-600/20",
};

export function Badge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        colors[value] ?? "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {enumLabel(value)}
    </span>
  );
}
