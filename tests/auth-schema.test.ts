import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/schemas/auth";

describe("auth schemas", () => {
  it("validates login", () => {
    expect(
      loginSchema.safeParse({
        email: "admin@example.com",
        password: "ChangeMe123!",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed registration", () => {
    expect(
      registerSchema.safeParse({
        email: "invalid",
        password: "short",
        firstName: "",
        lastName: "",
      }).success,
    ).toBe(false);
  });
});
