import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";

export default function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
