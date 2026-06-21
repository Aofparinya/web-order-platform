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

test("admin can open warehouse management without a runtime error", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill("admin@order-platform.local");
  await page.getByLabel("รหัสผ่าน").fill("ChangeMe123!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/inventory/warehouses");
  await expect(
    page.getByRole("heading", { name: "คลังสินค้า" }),
  ).toBeVisible();
  await expect(page.getByText("This page couldn’t load")).not.toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "รหัสคลัง" }),
  ).toBeVisible();
});

test("registered user can view profile but cannot access administration", async ({
  page,
}, testInfo) => {
  const email = `e2e.web.${testInfo.project.name}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto("/register");
  await page.getByLabel("ชื่อ", { exact: true }).fill("Web");
  await page.getByLabel("นามสกุล", { exact: true }).fill("Tester");
  await page.getByLabel("อีเมล").fill(email);
  await page.getByLabel("รหัสผ่าน").fill("P@ssw0rd123!");
  await page.getByRole("button", { name: "สมัครสมาชิก" }).click();
  await expect(page).toHaveURL(/\/store/);
  await expect(
    page.getByRole("heading", {
      name: "เลือกสินค้าที่มีพร้อมขายจากคลัง",
    }),
  ).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "ข้อมูลบัญชี" })).toBeVisible();
  await expect(
    page.getByRole("main").getByText(email, { exact: true }),
  ).toBeVisible();

  await page.goto("/users");
  await expect(page).toHaveURL(/\/store/);
});

test("checkout refreshes CSRF token after logout and a new login", async ({
  page,
}, testInfo) => {
  const unique = `${testInfo.project.name}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  async function register(email: string) {
    await page.goto("/register");
    const inputs = page.locator("form input");
    await inputs.nth(0).fill("CSRF");
    await inputs.nth(1).fill("Tester");
    await inputs.nth(2).fill(email);
    await inputs.nth(3).fill("P@ssw0rd123!");
    await page.locator("form button").click();
    await expect(page).toHaveURL(/\/store/);
  }

  await register(`csrf.first.${unique}@example.com`);
  await page.locator("button[title]").click();
  await expect(page).toHaveURL(/\/login/);

  await page.evaluate(() => {
    window.localStorage.setItem(
      "order-platform-store-cart",
      JSON.stringify([
        {
          skuId: "02537f1a-0f41-4066-9b18-d9d653badd7b",
          productId: "0238d53e-0ddf-4b40-84fe-8c0496129eb8",
          productName: "Regression Product",
          skuName: "Regression SKU",
          skuCode: "REG-CSRF",
          warehouseId: "e73fcecf-e5bf-47ca-86bf-88f9aaa4e6dd",
          warehouseName: "Regression Warehouse",
          price: 100,
          currency: "THB",
          available: 5,
          quantity: 1,
        },
      ]),
    );
  });

  let tokensMatched = false;
  await page.route("**/api/store/checkout", async (route) => {
    const headerToken = route.request().headers()["x-csrf-token"];
    const cookieToken = (
      await page.context().cookies("http://127.0.0.1:3004")
    ).find((cookie) => cookie.name === "op_csrf")?.value;
    tokensMatched = Boolean(headerToken && headerToken === cookieToken);
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        order: { orderNumber: "CSRF-REGRESSION-OK" },
      }),
    });
  });

  await register(`csrf.second.${unique}@example.com`);
  await page.goto("/store/cart");
  await expect(page.getByText("Regression Product")).toBeVisible();
  const addressInputs = page.locator("main input");
  await addressInputs.nth(0).fill("99 Test Road");
  await addressInputs.nth(2).fill("Samsen Nok");
  await addressInputs.nth(3).fill("Huai Khwang");
  await addressInputs.nth(4).fill("Bangkok");
  await addressInputs.nth(5).fill("10310");
  await page.locator("main button").last().click();
  await expect(page).toHaveURL(/\/store\/orders/);
  expect(tokensMatched).toBe(true);
});
