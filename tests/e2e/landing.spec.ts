import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("landing motion settles after rapid interaction and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const detail = page.getByRole("region", { name: "Demo report detail" });
  await detail.scrollIntoViewIfNeeded();
  const suggestion = page.getByRole("button", { name: /Add a dark mode option/ });
  await suggestion.click();
  await page.getByRole("button", { name: /Checkout button does not respond/ }).click();
  await suggestion.click();
  await expect(detail.getByText("app.example.test/settings")).toBeVisible();
  await expect
    .poll(() => detail.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");

  const open = page.getByRole("button", { name: "Try the widget", exact: true });
  const dialog = page.getByRole("dialog", { name: "Widget demo" });
  await page.locator("dialog.landing-demo").evaluate((element) => {
    const observer = new MutationObserver(() => {
      if ((element as HTMLElement).style.transform) {
        element.setAttribute("data-motion-observed", "true");
        observer.disconnect();
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ["style"] });
  });
  await open.click();
  await expect(dialog).toHaveAttribute("data-motion-observed", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await open.click();
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => element.style.transform)).toBe("");
  await page.keyboard.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await open.click();
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.keyboard.press("Escape");
  await suggestion.click();
  await expect(detail.getByText("app.example.test/settings")).toBeVisible();
  expect(await detail.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});

test("completed entrances remain settled across resizing and preference changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const detail = page.getByRole("region", { name: "Demo report detail" });
  await detail.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("[data-detail-motion]")
        .last()
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe("none");
  await expect
    .poll(() =>
      page
        .locator("[data-hero-motion]")
        .first()
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe("none");
  await page.setViewportSize({ width: 650, height: 900 });
  const transforms = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return Array.from(
      document.querySelectorAll("[data-hero-motion], [data-report-motion], [data-detail-motion]"),
    ).map((element) => getComputedStyle(element).transform);
  });
  expect(transforms.every((transform) => transform === "none")).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(
    await page
      .locator("[data-detail-motion]")
      .last()
      .evaluate((element) => getComputedStyle(element).transform),
  ).toBe("none");
});

test("widget illustration contents fit at intermediate widths", async ({ page }) => {
  await page.goto("/");
  for (const width of [701, 720]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page
      .locator("figure")
      .filter({ hasText: "Example visitor widget" })
      .evaluate((figure) => {
        const bounds = figure.getBoundingClientRect();
        return Array.from(figure.querySelectorAll("*")).some(
          (child) => child.getBoundingClientRect().right > bounds.right + 1,
        );
      });
    expect(overflow).toBe(false);
  }
});

test("public landing demo never writes feedback and works on mobile", async ({ page, request }) => {
  await request.post("/api/auth/sign-in/email", {
    headers: { Origin: "http://localhost:3100" },
    data: { email: "test-admin@ureport.example", password: "Test-password-ureport-2026!" },
  });
  const before = await (await request.get("/api/admin/feedback")).json();
  const submissions: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/feedback") && r.method() === "POST") {
      submissions.push(r.url());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const reportDetail = page.getByRole("region", { name: "Demo report detail" });
  await page.getByRole("button", { name: /Add a dark mode option/ }).click();
  await expect(reportDetail.getByText("app.example.test/settings")).toBeVisible();
  await expect(
    reportDetail.getByText("Include this request in the next design review."),
  ).toBeVisible();
  await page.getByRole("button", { name: /The new help page is easy to follow/ }).click();
  await expect(reportDetail.getByText("help.example.test/getting-started")).toBeVisible();
  await page.getByRole("button", { name: /Checkout button does not respond/ }).click();
  await expect(page.getByRole("link", { name: "Set up HearDesk", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).first()).toHaveAttribute(
    "href",
    "/login",
  );
  await page.getByRole("button", { name: "Try the widget", exact: true }).click();
  const demo = page.getByRole("dialog", { name: "Widget demo" });
  await expect(demo).toBeVisible();
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("Pesan wajib diisi");
  await demo.getByLabel(/Pesan/).fill("Masukan demo, tidak boleh masuk database.");
  await demo.locator("summary").filter({ hasText: "Tambahkan email" }).click();
  await demo.getByLabel("Email", { exact: true }).fill("invalid");
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("alamat email");
  await demo.getByLabel("Email", { exact: true }).fill("demo@example.com");
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } })
    .png()
    .toBuffer();
  await demo
    .getByLabel(/Screenshot/)
    .setInputFiles({ name: "demo.png", mimeType: "image/png", buffer: png });
  await expect(demo.getByAltText("Preview screenshot pilihan Anda")).toBeVisible();
  await demo.getByRole("button", { name: "Kirim simulasi", exact: true }).click();
  await expect(demo.getByRole("heading", { name: "Simulasi selesai" })).toBeVisible();
  await expect(
    demo.getByText("Tidak ada pesan, email, atau screenshot yang dikirim ke server."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(demo).toBeHidden();
  await expect(page.getByRole("button", { name: "Try the widget", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Try the widget", exact: true }).click();
  await page.mouse.click(4, 4);
  await expect(demo).toBeHidden();
  await page.getByRole("link", { name: "How it works", exact: true }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await page.getByRole("link", { name: "HearDesk", exact: true }).first().click();
  for (const width of [320, 390, 700, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Try the widget", exact: true }).click();
  await expect(demo).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await demo.getByRole("button", { name: "Tutup formulir" }).click();
  await expect(demo).toBeHidden();
  for (const label of ["Open widget demo", "Try a demo report"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(demo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(demo).toBeHidden();
    await expect(page.getByRole("button", { name: label, exact: true })).toBeFocused();
  }
  const suggestion = page.getByRole("button", { name: /Add a dark mode option/ });
  await suggestion.focus();
  await page.keyboard.press("Enter");
  await expect(reportDetail.getByText("app.example.test/settings")).toBeVisible();
  expect(await suggestion.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
    "solid",
  );
  const metrics = await page.evaluate(() => {
    const heading = document.querySelector("h1")!;
    const buttons = Array.from(document.querySelectorAll("main button"));
    return {
      viewport: innerWidth,
      headingSize: getComputedStyle(heading).fontSize,
      minimumButtonHeight: Math.min(
        ...buttons.map((button) => button.getBoundingClientRect().height),
      ),
    };
  });
  expect(metrics.minimumButtonHeight).toBeGreaterThanOrEqual(44);
  console.log("Landing mobile verification:", metrics);
  await page.getByRole("link", { name: "Widget integration guide", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Integrasikan widget HearDesk ke website Anda" }),
  ).toBeVisible();
  const after = await (await request.get("/api/admin/feedback")).json();
  expect(after.total).toBe(before.total);
  expect(submissions).toEqual([]);
  expect(errors).toEqual([]);
});
