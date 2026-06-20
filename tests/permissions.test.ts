import { describe, expect, it } from "vitest";
import { can, isAdmin, permissions } from "@/lib/permissions";

const user = {
  id: "1",
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  isActive: true,
  roles: ["USER"],
  permissions: ["profile.read"],
};

describe("permission mapping", () => {
  it("allows explicit permission", () => {
    expect(can({ ...user, permissions: [permissions.catalogRead] }, permissions.catalogRead)).toBe(true);
  });

  it("grants admin access", () => {
    expect(isAdmin({ ...user, roles: ["ADMIN"] })).toBe(true);
    expect(can({ ...user, roles: ["ADMIN"] }, permissions.inventoryWrite)).toBe(true);
  });

  it("denies normal users", () => {
    expect(can(user, permissions.customersRead)).toBe(false);
  });
});
