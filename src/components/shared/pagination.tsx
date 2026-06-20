"use client";

import { Button } from "@/components/ui/button";
import type { Pagination as PaginationType } from "@/types/api";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination?: PaginationType;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>
        หน้า {pagination.page} จาก {pagination.totalPages} · ทั้งหมด{" "}
        {pagination.total} รายการ
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          ก่อนหน้า
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          ถัดไป
        </Button>
      </div>
    </div>
  );
}
