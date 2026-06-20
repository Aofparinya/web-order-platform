import type { ApiError } from "@/types/api";

export function normalizeApiError(value: unknown, fallback = "เกิดข้อผิดพลาดจากระบบ") {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as ApiError).message === "string"
  ) {
    return (value as ApiError).message;
  }
  return fallback;
}
