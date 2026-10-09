import { test, expect } from "@playwright/test";
test.use({ storageState: "test-results/admin-state.json" });
test("landing and login recognize current owner session and revoked cookies", async ({
  page,
  browser,
}) => {
  const login = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://localhost:3100" },
    data: { email: "test-admin@ureport.example", password: "Test-password-ureport-2026!" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open dashboard", exact: true })).toHaveCount(3);
  await page.getByRole("link", { name: "Open dashboard", exact: true }).first().click();
  await expect(page).toHaveURL(/platform\/overview/);
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Open dashboard", exact: true }).first(),
  ).toBeVisible();
  await page.goto("/login");
  await expect(page).toHaveURL(/platform\/overview/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toHaveCount(0);
  const cookies = await page.context().cookies();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open dashboard", exact: true })).toHaveCount(0);
  const replay = await browser.newContext({ storageState: { cookies, origins: [] } });
  try {
    const tab = await replay.newPage();
    await tab.goto("http://localhost:3100/login");
    await expect(tab.getByRole("heading", { name: "Sign in to HearDesk" })).toBeVisible();
    await tab.goto("http://localhost:3100/");
    await expect(tab.getByRole("link", { name: "Open dashboard", exact: true })).toHaveCount(0);
  } finally {
    await replay.close();
  }
});
