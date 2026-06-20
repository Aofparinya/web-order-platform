import { expect, test } from "@playwright/test";

test("login page is responsive and exposes registration", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "สมัครสมาชิก" })).toBeVisible();
});

test("admin can login and see permitted navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill("admin@order-platform.local");
  await page.getByLabel("รหัสผ่าน").fill("ChangeMe123!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: "เปิดเมนู" }).click();
  }
  await expect(
    page.getByRole("link", { name: "ผู้ใช้งาน", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "สินค้า", exact: true }),
  ).toBeVisible();
});

test("admin can open the orders back office", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill("admin@order-platform.local");
  await page.getByLabel("รหัสผ่าน").fill("ChangeMe123!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/orders/);
  await expect(page.locator("main h1")).toBeVisible();
});

test("registered user can view profile but cannot access administration", async ({
  page,
}) => {
  const email = `e2e.web.${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("ชื่อ", { exact: true }).fill("Web");
  await page.getByLabel("นามสกุล", { exact: true }).fill("Tester");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill("P@ssw0rd123!");
  await page.getByRole("button", { name: "สมัครสมาชิก" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "ข้อมูลบัญชี" })).toBeVisible();
  await expect(
    page.getByRole("main").getByText(email, { exact: true }),
  ).toBeVisible();

  await page.goto("/users");
  await expect(
    page.getByRole("heading", { name: "ไม่มีสิทธิ์เข้าถึง" }),
  ).toBeVisible();
});
