"use client";

import type { ApiError } from "@/types/api";
import { normalizeApiError } from "./api-error";

let csrfToken: string | null = null;

function csrfCookie() {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("op_csrf="))
    ?.slice("op_csrf=".length);
  return value ? decodeURIComponent(value) : null;
}

async function getCsrfToken(forceRefresh = false) {
  const cookieToken = csrfCookie();
  if (!forceRefresh && cookieToken) {
    csrfToken = cookieToken;
    return cookieToken;
  }
  if (!forceRefresh && csrfToken) return csrfToken;
  const response = await fetch("/api/session/csrf", {
    cache: "no-store",
    credentials: "same-origin",
  });
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
  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("x-csrf-token", await getCsrfToken());
  }
  const target = path.startsWith("/api/")
    ? path
    : `/api/backend/${path.replace(/^\/+/, "")}`;
  const request = () =>
    fetch(target, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "same-origin",
    });
  let response = await request();
  if (
    response.status === 403 &&
    !["GET", "HEAD", "OPTIONS"].includes(method)
  ) {
    const error = (await response
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null;
    if (error?.code === "INVALID_CSRF") {
      csrfToken = null;
      headers.set("x-csrf-token", await getCsrfToken(true));
      response = await request();
    }
  }
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
