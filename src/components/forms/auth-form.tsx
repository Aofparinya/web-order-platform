"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";
import { homeRoute } from "@/lib/permissions";
import type { AuthUser } from "@/types/api";

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schema = mode === "login" ? loginSchema : registerSchema;
  const form = useForm<LoginValues | RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : { email: "", password: "", firstName: "", lastName: "" },
  });

  async function submit(values: LoginValues | RegisterValues) {
    const response = await fetch(`/api/session/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({
        message: "ไม่สามารถดำเนินการได้",
      }))) as { message: string };
      toast.error(error.message);
      return;
    }
    const result = (await response.json()) as { user: AuthUser };
    toast.success(mode === "login" ? "เข้าสู่ระบบสำเร็จ" : "สร้างบัญชีสำเร็จ");
    router.replace(searchParams.get("next") ?? homeRoute(result.user));
    router.refresh();
  }

  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;
  return (
    <Card className="w-full max-w-md border-0 shadow-xl">
      <CardContent className="p-7 sm:p-9">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">Order Platform</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            {mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login"
              ? "ADMIN จะเข้าสู่ Back Office ส่วน USER จะเข้าสู่หน้าร้าน"
              : "บัญชี USER สามารถเลือกสินค้าในคลัง สร้างคำสั่งซื้อ และดูข้อมูลส่วนตัว"}
          </p>
        </div>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          {mode === "register" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อ" error={errors.firstName?.message}>
                <Input {...form.register("firstName")} />
              </Field>
              <Field label="นามสกุล" error={errors.lastName?.message}>
                <Input {...form.register("lastName")} />
              </Field>
            </div>
          )}
          <Field label="อีเมล" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="รหัสผ่าน" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...form.register("password")}
            />
          </Field>
          <Button
            className="mt-2 w-full"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "กำลังดำเนินการ..."
              : mode === "login"
                ? "เข้าสู่ระบบ"
                : "สมัครสมาชิก"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
          <Link
            className="font-semibold text-blue-600 hover:text-blue-700"
            href={mode === "login" ? "/register" : "/login"}
          >
            {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
