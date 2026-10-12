import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parse } from "dotenv";
import pg from "pg";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

test("visitor tracks an anonymous report and sees public replies but never internal notes", async ({
  page,
  browser,
}) => {
  test.setTimeout(45000);
  const origin = "http://localhost:3100";
  const values = parse(await readFile(".env.test"));
  validateTestDatabaseUrls(values.DATABASE_URL, values.MIGRATION_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: values.DATABASE_URL });
  try {
    await pool.query('DELETE FROM "RateBucket" WHERE key LIKE $1', ["submit:%"]);
    await pool.query('DELETE FROM "RateBucket" WHERE key LIKE $1', ["auth:%"]);
    await pool.query('DELETE FROM "rateLimit"');
  } finally {
    await pool.end();
  }
  await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: "test-admin@ureport.example", password: "Test-password-ureport-2026!" },
  });
  const site = await (await page.request.get("/api/admin/site")).json();
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  const errors: string[] = [];
  visitor.on("pageerror", (error) => errors.push(error.message));
  await visitor.goto(`http://localhost:3200/?site=${site.publicKey}`);
  await visitor.getByRole("button", { name: site.buttonLabel, exact: true }).click();
  const widget = visitor.frameLocator("iframe");
  await widget.getByLabel(/Pesan/).fill("Anonymous tracking end-to-end report");
  await widget.getByRole("button", { name: "Kirim feedback", exact: true }).click();
  await expect(widget.getByRole("heading", { name: "Feedback sudah diterima" })).toBeVisible();
  const code = await widget.getByLabel("Kode pelacakan").inputValue();
  expect(code).toMatch(/^[a-f0-9]{48}$/);
  const link = await widget
    .getByRole("link", { name: "Lihat status & balasan" })
    .getAttribute("href");
  expect(link).toBe(`${origin}/track#code=${code}`);
  const popupPromise = visitor.waitForEvent("popup");
  await widget.getByRole("link", { name: "Lihat status & balasan" }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole("article", { name: "Hasil pelacakan" })).toBeVisible();
  await popup.close();
  const list = await (
    await page.request.get("/api/admin/feedback?q=Anonymous%20tracking%20end-to-end%20report")
  ).json();
  const id = list.items[0].id;
  await page.goto(`/inbox/${id}`);
  await page.getByLabel("Balasan publik", { exact: true }).fill("Perbaikan sedang kami siapkan.");
  await page.getByRole("button", { name: "Kirim balasan ke pelapor", exact: true }).click();
  await expect(page.getByText("Perbaikan sedang kami siapkan.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Tambah catatan", { exact: true })
    .fill("Private internal incident details");
  await page.getByRole("button", { name: "Tambah catatan", exact: true }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("REVIEWING");
  await expect(page.getByText("Status tersimpan.", { exact: true })).toBeVisible();
  await visitor.goto(link!);
  await expect(visitor.getByRole("region", { name: "Hasil pelacakan" })).toHaveCount(0);
  await expect(visitor.getByRole("article", { name: "Hasil pelacakan" })).toBeVisible();
  await expect(visitor.getByText("Perbaikan sedang kami siapkan.", { exact: true })).toBeVisible();
  await expect(visitor.getByText("Ditinjau", { exact: true })).toBeVisible();
  await expect(visitor.getByText("Private internal incident details")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("DONE");
  await expect(page.getByText("Status tersimpan.", { exact: true })).toBeVisible();
  await visitor.getByRole("button", { name: "Perbarui status" }).click();
  await expect(visitor.getByText("Selesai", { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await visitor.setViewportSize({ width, height: 900 });
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await visitor.goto("/track");
  await visitor.getByLabel("Kode pelacakan").fill(randomBytes(24).toString("hex"));
  await visitor.getByRole("button", { name: "Lihat perkembangan" }).click();
  await expect(visitor.getByRole("main").getByRole("alert")).toContainText(
    "Feedback tidak ditemukan",
  );
  await visitor.getByLabel("Kode pelacakan").fill(code);
  await visitor.getByRole("button", { name: "Lihat perkembangan" }).click();
  await expect(visitor.getByText("Perbaikan sedang kami siapkan.", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await anonymous.close();
  const cleanup = new pg.Pool({ connectionString: values.DATABASE_URL });
  try {
    await cleanup.query('DELETE FROM "RateBucket" WHERE key LIKE $1', ["auth:%"]);
    await cleanup.query('DELETE FROM "rateLimit"');
  } finally {
    await cleanup.end();
  }
});
