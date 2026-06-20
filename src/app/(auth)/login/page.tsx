import { Suspense } from "react";
import { AuthForm } from "@/components/forms/auth-form";

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
