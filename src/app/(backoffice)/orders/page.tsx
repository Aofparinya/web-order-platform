"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, Page } from "@/types/api";

export default function OrdersPage() {
  const [filters, setFilters] = useState({ q: "", status: "", page: 1, pageSize: 20 });
  const orders = useQuery({
    queryKey: ["orders", filters],
    queryFn: () => apiFetch<Page<Order>>(`orders${toQueryString(filters)}`),
  });
  const columns: ColumnDef<Order>[] = [
    {
      header: "เลขที่คำสั่งซื้อ",
      cell: ({ row }) => <Link href={`/orders/${row.original.id}`} className="font-semibold text-blue-700">{row.original.orderNumber}</Link>,
    },
    { header: "สถานะ", cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "ยอดสุทธิ", cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency) },
    { header: "วันที่สร้าง", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  ];
  return (
    <PermissionGate permission={permissions.ordersRead}>
      <PageHeader
        title="คำสั่งซื้อ"
        description="จัดการ Draft, การชำระเงิน, Invoice และ Workflow"
        actions={<Button asChild><Link href="/orders/new"><Plus /> สร้างคำสั่งซื้อ</Link></Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="ค้นหาเลขที่คำสั่งซื้อ" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value, page: 1 })} />
        <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value, page: 1 })}>
          <option value="">ทุกสถานะ</option>
          {["DRAFT", "PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "EXPIRED", "REVIEW_REQUIRED"].map((status) => <option key={status}>{status}</option>)}
        </Select>
      </div>
      {orders.isLoading ? <LoadingState /> : <DataTable data={orders.data?.data ?? []} columns={columns} />}
      <Pagination pagination={orders.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} />
    </PermissionGate>
  );
}
