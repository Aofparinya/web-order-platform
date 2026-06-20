import { describe, expect, it } from "vitest";
import { normalizeApiError } from "@/lib/api-error";
import { enumLabel } from "@/lib/labels";

describe("enum labels", () => {
  it("returns Thai labels and preserves unknown values", () => {
    expect(enumLabel("PENDING")).toBe("รอดำเนินการ");
    expect(enumLabel("CUSTOM")).toBe("CUSTOM");
  });
});

describe("API error normalization", () => {
  it("uses service messages when available", () => {
    expect(normalizeApiError({ message: "Email already exists" })).toBe(
      "Email already exists",
    );
  });

  it("falls back for malformed payloads", () => {
    expect(normalizeApiError(null, "fallback")).toBe("fallback");
  });
});
