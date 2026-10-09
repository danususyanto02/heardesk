import { test, expect } from "@playwright/test";
test.use({ storageState: "test-results/admin-state.json" });
test("platform owner has separate console, real metadata and audited Company management", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/platform\/overview/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Platform navigation" })).toBeVisible();
  await expect(page.locator(".highcharts-container")).toHaveCount(2);
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("annual");
  expect(
    (await (await page.request.get("/api/platform/activity?period=annual&year=2024")).json())
      .points,
  ).toHaveLength(12);
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("monthly");
  await page.getByRole("combobox", { name: "Month", exact: true }).selectOption("2");
  expect(
    (
      await (
        await page.request.get("/api/platform/activity?period=monthly&year=2024&month=2")
      ).json()
    ).points,
  ).toHaveLength(29);
  await page.getByRole("link", { name: "Companies", exact: true }).click();
  const metadata = await (await page.request.get("/api/platform/companies")).json();
  expect(metadata.items.length).toBeGreaterThan(0);
  const company = metadata.items[0];
  const original = await (await page.request.get(`/api/platform/companies/${company.id}`)).json();
  expect(
    (
      await page.request.patch(`/api/platform/companies/${company.id}`, {
        headers: { Origin: "https://evil.test" },
        data: {
          action: "status",
          status: "SUSPENDED",
          reason: "hostile",
          expectedUpdatedAt: original.updatedAt,
        },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("link", { name: company.name, exact: true }).click();
  await expect(page.getByRole("heading", { name: company.name, exact: true })).toBeVisible();
  await page.getByLabel("Websites limit", { exact: true }).fill("7");
  await page
    .getByLabel("Reason for status change", { exact: true })
    .fill("Browser suspension check");
  await page.getByRole("button", { name: "Suspend Company", exact: true }).click();
  await expect(page.getByText("Company status updated.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Websites limit", { exact: true })).toHaveValue("7");
  expect(
    (await (await page.request.get(`/api/platform/companies/${company.id}`)).json()).status,
  ).toBe("SUSPENDED");
  await page
    .getByLabel("Reason for status change", { exact: true })
    .fill("Browser reactivation check");
  await page.getByRole("button", { name: "Reactivate Company", exact: true }).click();
  await expect(page.getByRole("button", { name: "Suspend Company", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reload saved allowances", exact: true }).click();
  await page.getByLabel("Websites limit", { exact: true }).fill("3");
  await page.getByLabel("Reason for allowance change", { exact: true }).fill("Beta quota test");
  await page.getByRole("button", { name: "Save allowances", exact: true }).click();
  await expect(page.getByText("Company allowances updated.", { exact: true })).toBeVisible();
  expect(
    (
      await page.request.patch(`/api/platform/companies/${company.id}`, {
        headers: { Origin: "http://localhost:3100" },
        data: {
          action: "status",
          status: "SUSPENDED",
          reason: "stale update",
          expectedUpdatedAt: original.updatedAt,
        },
      })
    ).status(),
  ).toBe(409);
  await page.getByRole("link", { name: "Audit Log", exact: true }).click();
  await expect(page.getByText("Beta quota test", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Users", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Users", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Rows per page", exact: true }).selectOption("10");
  await expect(page).toHaveURL(/pageSize=10/);
  const userList = await (await page.request.get("/api/platform/users?pageSize=10")).json();
  expect(userList.items.length).toBeLessThanOrEqual(10);
  expect(userList.pageSize).toBe(10);
  const client = userList.items.find(
    (user: { platformRole: string }) => user.platformRole === "USER",
  );
  await page.goto(`/platform/users/${client.id}`);
  await page.getByLabel("Reason for account action").fill("E2E account review");
  await page.getByRole("button", { name: "Suspend account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reactivate account", exact: true })).toBeVisible();
  await page.getByLabel("Reason for account action").fill("E2E review complete");
  await page.getByRole("button", { name: "Reactivate account", exact: true }).click();
  await expect(page.getByRole("button", { name: "Suspend account", exact: true })).toBeVisible();
  await page.getByLabel("Reason for account action").fill("E2E revoke check");
  await page.getByRole("button", { name: "Revoke sessions", exact: true }).click();
  await expect(page.getByText("All sessions revoked.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Usage", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Company usage", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/platform-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/platform/overview");
  await expect(page.locator(".highcharts-container")).toHaveCount(2);
  await expect(page.getByText("Loading activity...", { exact: true })).toHaveCount(0);
  expect(
    await page
      .locator(".platform-content")
      .evaluate((element) => innerWidth - element.getBoundingClientRect().right),
  ).toBeLessThan(40);
  await page.screenshot({ path: "test-results/platform-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Open Company Dashboard", exact: true }).click();
  await expect(page).toHaveURL(/companies/);
  await page.goto("/platform/overview");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill("test-admin@ureport.example");
  await page.getByLabel("Password", { exact: true }).fill("Test-password-ureport-2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/platform\/overview/);
  expect(errors).toEqual([]);
});
