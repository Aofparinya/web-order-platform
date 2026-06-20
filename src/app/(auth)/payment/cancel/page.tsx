import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentCancelPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><Card className="max-w-lg"><CardContent className="p-10 text-center"><XCircle className="mx-auto size-14 text-amber-600" /><h1 className="mt-4 text-2xl font-bold">ยังไม่ได้ชำระเงิน</h1><p className="mt-2 text-slate-500">Checkout ถูกยกเลิก สามารถกลับไปเปิดลิงก์ชำระเงินใหม่ได้ก่อน reservation หมดอายุ</p><Button asChild className="mt-6"><Link href="/orders">กลับไปหน้าคำสั่งซื้อ</Link></Button></CardContent></Card></main>;
}
