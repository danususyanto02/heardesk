import { test, expect } from "@playwright/test";
import sharp from "sharp";
const origin = "http://localhost:3100";
const email = "test-admin@ureport.example";
const password = "Test-password-ureport-2026!";
test("successful setup with failed auto-login does not ask to create account again", async ({
  page,
}) => {
  let setupRequests = 0;
  await page.route("**/api/setup", (route) => {
    setupRequests++;
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: '{"success":true}',
    });
  });
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":{"message":"Network unavailable"}}',
    }),
  );
  await page.goto("/setup");
  await page
    .getByLabel("Kode aktivasi instalasi")
    .fill("test-bootstrap-ureport-only-000000000000000000");
  await page.getByLabel("Email admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Akun admin sudah dibuat" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Masuk ke akun baru" })).toHaveAttribute(
    "href",
    "/login?setup=done",
  );
  await expect(page.getByRole("button", { name: "Buat akun", exact: true })).toHaveCount(0);
  expect(setupRequests).toBe(1);
});
test("setup, private admin, anonymous widget, attachments and logout", async ({
  page,
  request,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get("/api/admin/feedback")).status()).toBe(401);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Website feedback\.\s*Ready for your team\./ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Set up HearDesk", exact: true }).first(),
  ).toHaveAttribute("href", "/setup");
  await page.goto("/setup");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/setup-simple-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByLabel("Nama admin")).toHaveCount(0);
  await expect(page.getByLabel("Alamat website")).toHaveCount(0);
  await page
    .getByLabel("Kode aktivasi instalasi")
    .fill("test-bootstrap-ureport-only-000000000000000000");
  await page.getByLabel("Email admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/settings/);
  await expect(page.getByRole("heading", { name: "Tambahkan website" })).toBeVisible();
  expect((await (await page.request.get("/api/admin/site")).json()).configured).toBe(false);
  await page.screenshot({ path: "test-results/website-onboarding.png", fullPage: true });
  await expect(page.getByRole("button", { name: "Salin kode", exact: true })).toHaveCount(0);
  const repeat = await request.post("/api/setup", {
    headers: { Origin: origin },
    data: {
      token: "test-bootstrap-ureport-only-000000000000000000",
      name: "Other",
      email: "other@example.com",
      password,
      siteName: "Other",
      origin: "http://localhost:3200",
    },
  });
  expect(repeat.status()).toBe(409);
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await expect(page.getByText("Belum ada feedback", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Website", exact: true }).click();
  await page
    .getByLabel("Alamat website", { exact: true })
    .fill("http://localhost:3200/page?ref=test");
  await page.getByRole("button", { name: "Tambahkan website", exact: true }).click();
  await expect(page.getByText("Kode pemasangan", { exact: true })).toBeVisible();
  const site = await (await page.request.get("/api/admin/site")).json();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const hostile = await page.request.patch("/api/admin/site", {
    headers: { Origin: "https://evil.example" },
    data: { name: "Evil", origin: "http://localhost:3200", buttonLabel: "Bad", position: "right" },
  });
  expect(hostile.status()).toBe(403);
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.addInitScript(() => {
    const insertCollision = () => {
      const element = document.createElement("div");
      element.id = "ureport-feedback-1";
      document.documentElement.append(element);
    };
    if (document.documentElement) {
      insertCollision();
    } else {
      const observer = new MutationObserver(() => {
        if (document.documentElement) {
          observer.disconnect();
          insertCollision();
        }
      });
      observer.observe(document, { childList: true });
    }
  });
  await visitor.goto(
    `http://localhost:3200/page?site=${site.publicKey}&token=must-not-send#secret`,
  );
  await visitor.getByRole("button", { name: "Beri masukan" }).click();
  await expect(visitor.locator('iframe[title="Kirim feedback"]')).toHaveAttribute(
    "id",
    "ureport-feedback-2",
  );
  await expect(visitor.getByRole("button", { name: "Beri masukan" })).toHaveAttribute(
    "aria-controls",
    "ureport-feedback-2",
  );
  const widget = visitor.frameLocator('iframe[title="Kirim feedback"]');
  await widget.getByLabel(/Pesan/).fill("Laporan pengunjung tanpa login, screenshot terlampir.");
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } })
    .png()
    .toBuffer();
  await widget
    .getByLabel(/Screenshot/)
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: png });
  await widget.getByRole("button", { name: "Kirim feedback", exact: true }).click();
  await expect(widget.getByText("Feedback sudah diterima")).toBeVisible();
  await widget.getByRole("button", { name: "Tutup formulir" }).click();
  await expect(visitor.locator('[role="dialog"]')).toBeHidden();
  await page.goto("/inbox");
  await page.getByRole("link", { name: /Laporan pengunjung tanpa login/ }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("DONE");
  await expect(page.getByText("Status tersimpan.")).toBeVisible();
  await page
    .getByLabel("Tambah catatan", { exact: true })
    .fill("Catatan internal tersimpan nyata.");
  await page.getByRole("button", { name: "Tambah catatan", exact: true }).click();
  await expect(page.getByText("Catatan internal tersimpan nyata.", { exact: true })).toBeVisible();
  const id = page.url().split("/inbox/")[1].split("?")[0];
  const report = await (await page.request.get("/api/admin/feedback/" + id)).json();
  expect(report.pageUrl).toBe("http://localhost:3200/page");
  await page.route("**/api/admin/feedback/*/notes", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ response });
  });
  await page.getByLabel("Tambah catatan", { exact: true }).fill("Catatan concurrent tersimpan.");
  await page.getByRole("button", { name: "Tambah catatan", exact: true }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("ARCHIVED");
  await expect(
    page.locator(".note p").filter({ hasText: "Catatan concurrent tersimpan." }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Status", exact: true })).toHaveValue("ARCHIVED");
  await page.unrouteAll({ behavior: "wait" });
  expect(
    (await anonymous.request.get("/api/admin/attachments/" + report.attachment.id)).status(),
  ).toBe(401);
  expect(
    (await page.request.get("/api/admin/attachments/" + report.attachment.id)).headers()[
      "content-type"
    ],
  ).toBe("image/webp");
  await page.locator("summary").filter({ hasText: "Lihat screenshot" }).click();
  await expect(page.getByAltText("Screenshot yang diunggah pengunjung")).toBeVisible();
  const savedCookies = await page.context().cookies();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  const replay = await browser.newContext();
  await replay.addCookies(savedCookies);
  expect((await replay.request.get(origin + "/api/admin/feedback")).status()).toBe(401);
  await replay.close();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await anonymous.close();
});

test("anonymous retries, conflicting payloads, invalid files and request limits", async ({
  request,
}) => {
  const login = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email, password },
  });
  expect(login.ok()).toBe(true);
  const site = await (await request.get("/api/admin/site")).json();
  const submissionId = crypto.randomUUID();
  const input = {
    siteKey: site.publicKey,
    submissionId,
    type: "SUGGESTION",
    message: "Idempotency test",
    pageUrl: "https://website.example/page?secret=yes#value",
  };
  const first = await request.post("/api/feedback", { multipart: input });
  expect(first.status()).toBe(201);
  const duplicate = await request.post("/api/feedback", { multipart: input });
  expect(duplicate.status()).toBe(200);
  const conflict = await request.post("/api/feedback", {
    multipart: { ...input, message: "Conflicting content" },
  });
  expect(conflict.status()).toBe(409);
  const invalid = await request.post("/api/feedback", {
    multipart: {
      ...input,
      submissionId: crypto.randomUUID(),
      screenshot: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("this is not an image"),
      },
    },
  });
  expect(invalid.status()).toBe(415);
  const throttled = await request.post("/api/feedback", {
    multipart: { ...input, submissionId: crypto.randomUUID() },
  });
  expect(throttled.status()).toBe(429);
  const items = await (await request.get("/api/admin/feedback?q=Idempotency")).json();
  expect(items.total).toBe(1);
  const signup = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "https://evil.example" },
    data: { name: "Other", email: "other@example.com", password },
  });
  expect(signup.status()).toBe(403);
  const noOrigin = await request.patch("/api/admin/site", {
    data: { name: "Bad", origin: "http://localhost:3200", buttonLabel: "Bad", position: "left" },
  });
  expect(noOrigin.status()).toBe(403);
  const huge = await request.post("/api/feedback", {
    headers: { "Content-Type": "multipart/form-data; boundary=bad" },
    data: Buffer.alloc(6 * 1024 * 1024 + 1),
  });
  expect([413, 429]).toContain(huge.status());
  await request.storageState({ path: "test-results/admin-state.json" });
});
