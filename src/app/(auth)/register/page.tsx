import { Suspense } from "react";
import { AuthForm } from "@/components/forms/auth-form";

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
