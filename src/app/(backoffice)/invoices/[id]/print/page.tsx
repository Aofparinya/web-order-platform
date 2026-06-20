"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { Invoice } from "@/types/api";
import { InvoiceDocument } from "../page";

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const invoice = useQuery({ queryKey: ["invoices", id], queryFn: () => apiFetch<Invoice>(`invoices/${id}`) });
  if (!invoice.data) return <p className="p-8">กำลังโหลด...</p>;
  return <div className="mx-auto max-w-4xl p-6"><div className="mb-4 flex justify-end print:hidden"><Button onClick={() => window.print()}>พิมพ์</Button></div><InvoiceDocument invoice={invoice.data} /></div>;
}
