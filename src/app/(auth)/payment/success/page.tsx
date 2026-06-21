import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><Card className="max-w-lg"><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto size-14 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold">รับข้อมูลการชำระเงินแล้ว</h1><p className="mt-2 text-slate-500">ระบบกำลังตรวจสอบผลจาก Stripe, capture เงิน, ยืนยัน stock และอัปเดตสถานะคำสั่งซื้ออัตโนมัติ</p><Button asChild className="mt-6"><Link href="/store/orders">ดูคำสั่งซื้อของฉัน</Link></Button></CardContent></Card></main>;
}
