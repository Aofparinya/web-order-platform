"use client";

import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import type {
  StorefrontPaymentCheckout,
  StorefrontPaymentRetry,
} from "@/types/storefront";

export default function StorePaymentPage() {
  const params = useParams<{ id: string }>();
  const paymentId = params.id;
  const checkout = useQuery({
    queryKey: ["storefront-payment", paymentId],
    queryFn: () =>
      apiFetch<StorefrontPaymentCheckout>(`/api/store/payments/${paymentId}`),
    enabled: Boolean(paymentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "CAPTURE_PENDING" ? 1500 : false;
    },
  });

  if (checkout.isLoading) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-slate-500">
        <LoaderCircle className="size-8 animate-spin" />
      </div>
    );
  }
  if (checkout.isError || !checkout.data) {
    return (
      <Card className="mx-auto max-w-xl border-red-200 bg-red-50">
        <CardContent className="p-8 text-center text-red-700">
          <p>{checkout.error?.message ?? "ไม่พบรายการชำระเงิน"}</p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/store/orders">กลับไปคำสั่งซื้อของฉัน</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = checkout.data;
  const finished = ["CAPTURED", "CAPTURE_PENDING"].includes(data.status);
  const retryRequired =
    data.mode === "retry_required" || (data.mode as string) === "mock";

  return (
    <>
      <Button asChild variant="ghost" className="-ml-3 mb-5">
        <Link href="/store/orders">
          <ArrowLeft /> กลับไปคำสั่งซื้อของฉัน
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden">
          <div className="border-b bg-slate-950 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-blue-600">
                <CreditCard />
              </span>
              <div>
                <h1 className="text-xl font-bold">ชำระเงินอย่างปลอดภัย</h1>
                <p className="text-sm text-slate-300">
                  เลขที่ชำระ {data.paymentNumber}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            {finished ? (
              <PaymentReceived />
            ) : retryRequired ? (
              <RetryPayment paymentId={data.paymentId} />
            ) : data.publishableKey && data.clientSecret ? (
              <StripePayment checkout={data} />
            ) : (
              <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                Stripe configuration ไม่ครบ กรุณาตรวจ publishable key และ
                Checkout Session
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <PackageCheck className="text-blue-600" />
              <div>
                <p className="text-sm text-slate-500">คำสั่งซื้อ</p>
                <strong>{data.order.orderNumber}</strong>
              </div>
            </div>
            <div className="mt-5 space-y-3 border-y py-5">
              {data.order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-slate-600">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(item.lineTotal, data.currency)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-slate-500">ยอดชำระทั้งหมด</span>
              <strong className="text-2xl text-blue-700">
                {formatCurrency(data.amount, data.currency)}
              </strong>
            </div>
            <div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <LockKeyhole className="size-4 shrink-0" />
              ข้อมูลบัตรส่งตรงไป Stripe และไม่ผ่านหรือถูกจัดเก็บในระบบ Order
              Platform
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StripePayment({ checkout }: { checkout: StorefrontPaymentCheckout }) {
  const stripe = useMemo(
    () => loadStripe(checkout.publishableKey!),
    [checkout.publishableKey],
  );
  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{
        clientSecret: checkout.clientSecret!,
        defaultValues: { email: checkout.customerEmail },
        elementsOptions: {
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#2563eb",
              colorText: "#0f172a",
              borderRadius: "10px",
              fontFamily: "Noto Sans Thai, sans-serif",
            },
          },
        },
      }}
    >
      <StripePaymentForm paymentId={checkout.paymentId} />
    </CheckoutElementsProvider>
  );
}

function StripePaymentForm({ paymentId }: { paymentId: string }) {
  const checkoutState = useCheckoutElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [message, setMessage] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkoutState.type !== "success") return;
    if (!paymentComplete) {
      setMessage("กรุณากรอกข้อมูลการชำระเงินให้ครบถ้วน");
      return;
    }
    setSubmitting(true);
    setMessage(undefined);
    const returnUrl = `${window.location.origin}/payment/success?paymentId=${paymentId}`;
    try {
      const result = await withTimeout(
        checkoutState.checkout.confirm({ returnUrl }),
        30_000,
      );
      if (result.type === "error") {
        setMessage(result.error.message);
        setSubmitting(false);
        return;
      }
      window.location.assign(returnUrl);
    } catch {
      setMessage(
        "Stripe ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่ และตรวจว่าส่วนขยายบล็อกโฆษณาหรือความเป็นส่วนตัวไม่ได้บล็อก js.stripe.com",
      );
      setSubmitting(false);
    }
  }

  if (checkoutState.type === "loading") {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (checkoutState.type === "error") {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {checkoutState.error.message}
      </p>
    );
  }
  return (
    <form onSubmit={submit}>
      <PaymentElement
        options={{ layout: "tabs", paymentMethodOrder: ["card"] }}
        onChange={(event) => {
          setPaymentComplete(event.complete);
          if (event.complete) setMessage(undefined);
        }}
        onLoadError={(event) => {
          setPaymentComplete(false);
          setMessage(event.error.message);
        }}
      />
      {message && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        disabled={submitting || !paymentComplete}
      >
        {submitting ? (
          <>
            <LoaderCircle className="animate-spin" /> กำลังยืนยันกับ Stripe...
          </>
        ) : (
          <>
            <LockKeyhole /> ยืนยันการชำระเงิน
          </>
        )}
      </Button>
    </form>
  );
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("STRIPE_CONFIRM_TIMEOUT")),
      timeoutMilliseconds,
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function RetryPayment({ paymentId }: { paymentId: string }) {
  const retry = useMutation({
    mutationFn: () =>
      apiFetch<StorefrontPaymentRetry>(
        `/api/store/payments/${paymentId}`,
        { method: "POST", body: JSON.stringify({}) },
      ),
    onSuccess: ({ payment }) => {
      toast.success("สร้าง Stripe Checkout Session ใหม่แล้ว");
      window.location.assign(`/store/payment/${payment.id}`);
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
      <p className="font-bold text-amber-950">ต้องสร้าง Checkout ใหม่</p>
      <p className="mt-2 text-sm text-amber-800">
        รายการนี้สร้างจากระบบจำลองหรือ Stripe Session เดิมหมดอายุ
        ระบบจะสร้าง Payment ใหม่จากคำสั่งซื้อเดิมหากการจอง stock ยังไม่หมดอายุ
      </p>
      {retry.isError && (
        <p className="mt-4 rounded-xl bg-red-100 p-3 text-sm text-red-800">
          {retry.error.message}
        </p>
      )}
      <Button
        size="lg"
        className="mt-6 w-full"
        disabled={retry.isPending}
        onClick={() => retry.mutate()}
      >
        {retry.isPending ? (
          <>
            <LoaderCircle className="animate-spin" /> กำลังสร้าง Checkout...
          </>
        ) : (
          <>
            <CreditCard /> สร้าง Stripe Checkout ใหม่
          </>
        )}
      </Button>
    </div>
  );
}

function PaymentReceived() {
  return (
    <div className="py-8 text-center">
      <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
      <h2 className="mt-4 text-xl font-bold">รับคำขอชำระเงินแล้ว</h2>
      <p className="mt-2 text-sm text-slate-500">
        ระบบกำลัง capture เงิน ยืนยัน stock และออกใบแจ้งหนี้
      </p>
      <Button asChild className="mt-6">
        <Link href="/store/orders">ดูสถานะคำสั่งซื้อ</Link>
      </Button>
    </div>
  );
}
