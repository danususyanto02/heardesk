import { test, expect } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { parse } from "dotenv";
import { validateTestDatabaseUrls } from "../../scripts/test-config";

test("local client verifies email, creates Company, connects website and resets password", async ({
  page,
}) => {
  test.setTimeout(60000);
  const values = parse(await readFile(".env.test", "utf8"));
  validateTestDatabaseUrls(values.DATABASE_URL, values.MIGRATION_DATABASE_URL);
  const fixture = new pg.Pool({ connectionString: values.DATABASE_URL });
  try {
    await fixture.query(
      'DELETE FROM "RateBucket" WHERE key LIKE \'auth:%\'; DELETE FROM "rateLimit"',
    );
  } finally {
    await fixture.end();
  }
  const email = `onboarding-${crypto.randomUUID()}@example.test`;
  const password = "Client-password-2026!";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy|refused to/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.goto("/signup");
  await page.goto("/verify-email?verified=1&error=TOKEN_EXPIRED");
  await expect(page.getByRole("heading", { name: "Email verified" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resend verification link" })).toBeVisible();
  await page.goto("/signup");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Your name", { exact: true }).fill("Client Owner");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.screenshot({ path: "test-results/signup-mobile.png", fullPage: true });
  const colors = await page
    .getByRole("button", { name: "Create account", exact: true })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        foreground: style.color,
        background: style.backgroundColor,
        height: button.getBoundingClientRect().height,
      };
    });
  expect(colors.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  async function message(subject: string) {
    for (const file of await readdir("test-results/mailbox")) {
      const entry = JSON.parse(await readFile(path.join("test-results/mailbox", file), "utf8"));
      if (entry.to === email && entry.subject === subject) {
        return entry;
      }
    }
    throw new Error("Local email not captured: " + subject);
  }
  const verification = await message("Verify your HearDesk email");
  const link = verification.text.split("\n").find((line: string) => line.startsWith("http"));
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/companies/);
  await page.screenshot({ path: "test-results/company-onboarding-mobile.png", fullPage: true });
  await page.getByLabel("Company name", { exact: true }).fill("Client Company");
  await page.getByRole("button", { name: "Create Company", exact: true }).click();
  await expect(page).toHaveURL(/settings/);
  await page.getByLabel("Website address", { exact: true }).fill("https://client.example.test");
  await page.getByRole("button", { name: "Add website", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salin kode", exact: true })).toBeVisible();
  const companies = await (await page.request.get("/api/companies")).json();
  expect(companies).toHaveLength(1);
  expect(companies[0].name).toBe("Client Company");
  const companySettings = page.url();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Open dashboard", exact: true }).first().click();
  await expect(page).toHaveURL(/companies/);
  await page.goto("/login");
  await expect(page).toHaveURL(/companies/);
  await page.goto(companySettings);
  const originalCompany = companies[0].id;
  const originalSite = (
    await (await page.request.get(`/api/companies/${originalCompany}/sites`)).json()
  ).items;
  const secondCompany = await (
    await page.request.post("/api/companies", {
      headers: { Origin: "http://localhost:3100" },
      data: { name: "Second Company", idempotencyKey: crypto.randomUUID() },
    })
  ).json();
  const secondSite = await (
    await page.request.post(`/api/companies/${secondCompany.id}/sites`, {
      headers: { Origin: "http://localhost:3100" },
      data: {
        name: "Second site",
        origin: "https://second.example.test",
        buttonLabel: "Feedback",
        position: "right",
      },
    })
  ).json();
  await page.getByLabel("Nama website", { exact: true }).fill("Original tab draft");
  const otherTab = await page.context().newPage();
  await otherTab.goto("/companies");
  await otherTab.getByRole("radio", { name: /Second Company/ }).check();
  await otherTab.getByRole("button", { name: "Open selected Company" }).click();
  await expect(otherTab).toHaveURL(/settings/);
  await otherTab.getByRole("link", { name: /^Settings for / }).click();
  await expect(otherTab.getByLabel("Nama website", { exact: true })).toHaveValue("Second site");
  await page.getByRole("button", { name: "Simpan pengaturan", exact: true }).click();
  await expect(
    page.getByText("Pengaturan tersimpan. Muat ulang website untuk melihat perubahan.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/companies/${originalCompany}/sites/${originalSite[0].id}`)
      ).json()
    ).name,
  ).toBe("Original tab draft");
  expect(
    (
      await (
        await page.request.get(`/api/companies/${secondCompany.id}/sites/${secondSite.id}`)
      ).json()
    ).name,
  ).toBe("Second site");
  await page.getByRole("link", { name: "Laporan", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("company=" + originalCompany));
  expect(await page.locator("[data-company-id]").getAttribute("data-company-id")).toBe(
    originalCompany,
  );
  await page.goto(`/settings?company=${originalCompany}&site=${originalSite[0].id}`);
  await page.getByLabel("Nama website", { exact: true }).fill("Original tab second save");
  await page.getByRole("button", { name: "Simpan pengaturan", exact: true }).click();
  await expect(
    page.getByText("Pengaturan tersimpan. Muat ulang website untuk melihat perubahan.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/companies/${originalCompany}/sites/${originalSite[0].id}`)
      ).json()
    ).name,
  ).toBe("Original tab second save");
  expect(
    (
      await (
        await page.request.get(`/api/companies/${secondCompany.id}/sites/${secondSite.id}`)
      ).json()
    ).name,
  ).toBe("Second site");
  await otherTab.close();
  await page.goto("/companies");
  await expect(page.getByRole("radio", { name: /Client Company/ })).toBeVisible();
  await page.getByRole("radio", { name: /Client Company/ }).check();
  await expect(page.locator(".company-choice.selected")).toContainText("Client Company");
  await expect(page.getByRole("button", { name: "Open selected Company" })).toBeEnabled();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(
    page.getByText("If an account exists, a reset link has been sent.", { exact: true }),
  ).toBeVisible();
  const reset = await message("Reset your HearDesk password");
  await page.goto(reset.text.split("\n").find((line: string) => line.startsWith("http")));
  await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("Changed-client-password-2026!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText("Your password has been changed.", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
