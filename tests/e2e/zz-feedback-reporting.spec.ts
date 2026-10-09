import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
test.use({ storageState: "test-results/admin-state.json" });
test("Company monthly line chart and three Excel periods match aggregate data", async ({
  page,
  browser,
}) => {
  await page.goto("/inbox");
  await expect(
    page.getByRole("heading", { name: "Feedback per bulan", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".inbox-line-chart .highcharts-container")).toHaveCount(1);
  const heading = page.getByTestId("analytics-heading");
  const summary = page.getByTestId("analytics-summary");
  expect(await heading.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("1px");
  expect(await summary.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("1px");
  const yearBox = await page.getByLabel("Tahun grafik").boundingBox();
  const headingBox = await heading.boundingBox();
  expect(yearBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height);
  await page.screenshot({ path: "test-results/inbox-summary-desktop.png", fullPage: true });
  const id = await page.locator("[data-company-id]").getAttribute("data-company-id");
  const year = new Date().getUTCFullYear();
  const month = new Date().getUTCMonth() + 1;
  const report = await (
    await page.request.get(`/api/companies/${id}/feedback/statistics?period=annual&year=${year}`)
  ).json();
  expect(report.rows).toHaveLength(12);
  expect(report.totals.total).toBeGreaterThan(0);
  await page.getByLabel("Tahun grafik").selectOption(String(year));
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  expect(
    (
      await anonymous.request.get(
        `http://localhost:3100/api/companies/${id}/feedback/statistics?period=annual&year=${year}`,
      )
    ).status(),
  ).toBe(401);
  await anonymous.close();
  for (const period of ["annual", "monthly", "all"]) {
    await page.getByRole("button", { name: "Export Excel", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Export jumlah feedback" });
    await modal.getByLabel("Periode ekspor").selectOption(period);
    if (period === "monthly") {
      await modal.getByLabel("Bulan ekspor").selectOption(String(month));
    }
    const downloaded = page.waitForEvent("download");
    await modal.getByRole("button", { name: "Download Excel", exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    const file = await download.path();
    const workbook = new ExcelJS.Workbook();
    const bytes = await readFile(file!);
    await workbook.xlsx.load(new Uint8Array(bytes).buffer);
    const sheet = workbook.getWorksheet("Feedback totals")!;
    const expected = await (
      await page.request.get(
        `/api/companies/${id}/feedback/statistics?period=${period}&year=${year}&month=${month}`,
      )
    ).json();
    expect(sheet.getCell(`E${sheet.rowCount}`).value).toBe(expected.totals.total);
    expect(sheet.rowCount).toBe(expected.rows.length + 8);
  }
  await page.getByRole("button", { name: "Export Excel", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Export jumlah feedback" });
  await modal.getByLabel("Tahun ekspor").fill("1900");
  await modal.getByRole("button", { name: "Download Excel", exact: true }).click();
  await expect(modal.getByRole("alert")).toHaveText("Tidak ada feedback pada periode ini.");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".inbox-line-chart svg.highcharts-root")
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(350);
  await page.screenshot({ path: "test-results/inbox-chart-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const switcher = await page
    .getByRole("link", { name: "Switch Company", exact: true })
    .boundingBox();
  expect(switcher!.x).toBeGreaterThan(900);
  await page.getByRole("link", { name: "Website", exact: true }).click();
  const cell = page.locator(".website-action-cell").first();
  const box = await cell.boundingBox();
  await cell.click({ position: { x: box!.width - 8, y: box!.height - 8 } });
  await expect(page.getByText("Kode pemasangan", { exact: true })).toBeVisible();
});
