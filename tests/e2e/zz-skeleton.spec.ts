import { test, expect } from "@playwright/test";
test.use({ storageState: "test-results/admin-state.json" });
test("data skeletons remain until response, disappear on success/error and respect reduced motion", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://localhost:3100" },
    data: { email: "test-admin@ureport.example", password: "Test-password-ureport-2026!" },
  });
  expect(login.ok()).toBe(true);
  let release!: () => void;
  const hold = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/admin/feedback?*", async (route) => {
    await hold;
    await route.continue();
  });
  await page.goto("/inbox");
  const loading = page.getByRole("status", { name: "Memuat daftar feedback" });
  const shapes = page.locator(".skeleton-frame").filter({ has: loading });
  await expect(loading).toBeVisible();
  await expect(shapes.locator(".skeleton-block").first()).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      shapes
        .locator(".skeleton-block")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  release();
  await expect(loading).toHaveCount(0);
  await expect(page.locator(".table-panel tbody tr")).toHaveCount(2);
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/admin/feedback?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Loading test failed" } }),
    }),
  );
  await page.getByLabel("Cari isi feedback").fill("failure");
  await page.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page.locator(".table-panel [role=alert]")).toContainText("Loading test failed");
  await expect(loading).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  let releaseStats!: () => void;
  const statsHold = new Promise<void>((resolve) => (releaseStats = resolve));
  await page.route("**/feedback/statistics?*", async (route) => {
    await statsHold;
    await route.continue();
  });
  await page.goto("/inbox");
  const chart = page.getByRole("status", { name: "Memuat grafik feedback" });
  await expect(chart).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/skeleton-mobile.png", fullPage: true });
  releaseStats();
  await expect(chart).toHaveCount(0);
  await expect(page.locator(".inbox-line-chart .highcharts-container")).toHaveCount(1);
  await page.unrouteAll({ behavior: "wait" });
  const report = await (await page.request.get("/api/admin/feedback")).json();
  let releaseDetail!: () => void;
  const detailHold = new Promise<void>((resolve) => (releaseDetail = resolve));
  await page.route(`**/api/admin/feedback/${report.items[0].id}`, async (route) => {
    await detailHold;
    await route.continue();
  });
  await page.goto(`/inbox/${report.items[0].id}`);
  await expect(page.getByRole("status", { name: "Memuat detail feedback" })).toBeVisible();
  releaseDetail();
  await expect(page.getByRole("heading", { name: "Detail feedback", exact: true })).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  const site = await (await page.request.get("/api/admin/site")).json();
  let releaseSettings!: () => void;
  const settingsHold = new Promise<void>((resolve) => (releaseSettings = resolve));
  await page.route(`**/api/companies/${site.companyId}/sites/${site.id}`, async (route) => {
    await settingsHold;
    await route.continue();
  });
  await page.goto(`/settings?company=${site.companyId}&site=${site.id}`);
  await expect(page.getByRole("status", { name: "Memuat pengaturan website" })).toBeVisible();
  releaseSettings();
  await expect(page.getByRole("button", { name: "Salin kode", exact: true })).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  let releaseSites!: () => void;
  const sitesHold = new Promise<void>((resolve) => (releaseSites = resolve));
  await page.route(`**/api/companies/${site.companyId}/sites?*`, async (route) => {
    await sitesHold;
    await route.continue();
  });
  await page.goto(`/settings?company=${site.companyId}`);
  await expect(page.getByRole("status", { name: "Loading websites", exact: true })).toBeVisible();
  releaseSites();
  await expect(page.getByRole("link", { name: /^Settings for / }).first()).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
  let releaseActivity!: () => void;
  const activityHold = new Promise<void>((resolve) => (releaseActivity = resolve));
  await page.route("**/api/platform/activity?*", async (route) => {
    await activityHold;
    await route.continue();
  });
  await page.goto("/platform/overview");
  await expect(
    page.getByRole("status", { name: "Loading report activity", exact: true }),
  ).toBeVisible();
  releaseActivity();
  await expect(
    page.getByRole("status", { name: "Loading report activity", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".highcharts-container")).toHaveCount(2);
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/platform/activity?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":{"message":"Chart failed"}}',
    }),
  );
  await page.getByRole("combobox", { name: "Period", exact: true }).selectOption("annual");
  await expect(
    page.getByText("Activity could not be loaded. Retry the request.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Loading report activity", exact: true }),
  ).toHaveCount(0);
});
