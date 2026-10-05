import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("public landing demo never writes feedback and works on mobile", async ({ page, request }) => {
  await request.post("/api/auth/sign-in/email", { headers: { Origin: "http://localhost:3100" }, data: { email: "test-admin@ureport.example", password: "Test-password-ureport-2026!" } });
  const before = await (await request.get("/api/admin/feedback")).json();
  const submissions: string[] = [], errors: string[] = [];
  page.on("request", r => { if (r.url().includes("/api/feedback") && r.method() === "POST") submissions.push(r.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Siapkan instalasi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Masuk admin", exact: true }).first()).toHaveAttribute("href", "/login");
  await page.getByRole("button", { name: "Coba widget", exact: true }).click();
  const demo = page.getByRole("dialog", { name: "Demo widget" });
  await expect(demo).toBeVisible();
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("Pesan wajib diisi");
  await demo.getByLabel(/Pesan/).fill("Masukan demo, tidak boleh masuk database.");
  await demo.locator("summary").filter({ hasText: "Tambahkan email" }).click();
  await demo.getByLabel("Email", { exact: true }).fill("invalid");
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("alamat email");
  await demo.getByLabel("Email", { exact: true }).fill("demo@example.com");
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer();
  await demo.getByLabel(/Screenshot/).setInputFiles({ name: "demo.png", mimeType: "image/png", buffer: png });
  await expect(demo.getByAltText("Preview screenshot pilihan Anda")).toBeVisible();
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("heading", { name: "Simulasi selesai" })).toBeVisible();
  await expect(demo.getByText("Tidak ada pesan, email, atau screenshot yang dikirim ke server.")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(demo).toBeHidden();
  await expect(page.getByRole("button", { name: "Coba widget", exact: true })).toBeFocused();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Coba widget", exact: true }).click();
  await expect(demo).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await demo.getByRole("button", { name: "Tutup formulir" }).click(); await expect(demo).toBeHidden();
  await page.getByRole("link", { name: "Dokumentasi", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Pasang uReport di server Anda" })).toBeVisible();
  const after = await (await request.get("/api/admin/feedback")).json();
  expect(after.total).toBe(before.total); expect(submissions).toEqual([]); expect(errors).toEqual([]);
});
