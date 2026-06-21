"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { Toaster } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/types/api";
import { CartProvider } from "@/components/storefront/cart-provider";

const SessionContext = createContext<{
  user: AuthUser | null;
  loading: boolean;
}>({ user: null, loading: true });

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <CartProvider>{children}</CartProvider>
      </SessionProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<AuthUser>("/api/session/me"),
  });
  return (
    <SessionContext.Provider value={{ user: data ?? null, loading: isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
