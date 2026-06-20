"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { permissions } from "@/lib/permissions";
import { toQueryString } from "@/lib/query";
import { formatDateTime } from "@/lib/utils";
import type { Page, StockMovement, Warehouse } from "@/types/api";

export default function MovementsPage() {
  const [filters, setFilters] = useState({ warehouseId: "", page: 1, pageSize: 20 });
  const warehouses = useQuery({ queryKey: ["warehouses"], queryFn: () => apiFetch<Warehouse[]>("warehouses") });
  const movements = useQuery({ queryKey: ["movements", filters], queryFn: () => apiFetch<Page<StockMovement>>(`inventory/movements${toQueryString(filters)}`) });
  const columns: ColumnDef<StockMovement>[] = [
    { header: "เวลา", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    { header: "ประเภท", accessorKey: "movementType" },
    { header: "คลัง", cell: ({ row }) => warehouses.data?.find((item) => item.id === row.original.warehouseId)?.code ?? row.original.warehouseId },
    { header: "On hand Δ", accessorKey: "onHandChange" },
    { header: "Reserved Δ", accessorKey: "reservedChange" },
    { header: "คงเหลือ", cell: ({ row }) => `${row.original.onHandAfter} / ${row.original.reservedAfter}` },
    { header: "Reference", cell: ({ row }) => [row.original.referenceType, row.original.referenceId].filter(Boolean).join(" · ") || "-" },
  ];
  return <PermissionGate permission={permissions.inventoryRead}><PageHeader title="ความเคลื่อนไหวสต็อก" description="Movement ledger เป็น immutable record ของทุกการเปลี่ยนแปลง" /><Select className="mb-4 max-w-xs" value={filters.warehouseId} onChange={(event) => setFilters({ ...filters, warehouseId: event.target.value, page: 1 })}><option value="">ทุกคลัง</option>{warehouses.data?.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select>{movements.isLoading ? <LoadingState /> : <DataTable data={movements.data?.data ?? []} columns={columns} />}<Pagination pagination={movements.data?.pagination} onPageChange={(page) => setFilters({ ...filters, page })} /></PermissionGate>;
}
