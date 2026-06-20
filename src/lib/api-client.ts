"use client";

import type { ApiError } from "@/types/api";
import { normalizeApiError } from "./api-error";

let csrfToken: string | null = null;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch("/api/session/csrf", { cache: "no-store" });
  const data = (await response.json()) as { token: string };
  csrfToken = data.token;
  return csrfToken;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("x-csrf-token", await getCsrfToken());
  }
  const response = await fetch(
    path.startsWith("/api/") ? path : `/api/backend/${path.replace(/^\/+/, "")}`,
    {
      ...init,
      headers,
      cache: "no-store",
    },
  );
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.assign("/login");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: "ไม่สามารถเชื่อมต่อระบบได้",
    }))) as ApiError;
    throw new Error(normalizeApiError(error));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
