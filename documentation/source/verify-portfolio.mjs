import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const primary = path.resolve("documentation/docx");
const out = path.resolve("documentation/source/evidence/portfolio");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 960 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:8765/preview-neo-brutalism.html?v=heardesk-docs-1");
    await page.getByRole("button", { name: "View more projects", exact: true }).click();
    await page.getByRole("button", { name: "View project HearDesk", exact: true }).click();
    const dialog = page.locator("#project-dialog");
    await dialog.waitFor({ state: "visible" });
    assert.equal(await dialog.getByRole("heading", { name: "HearDesk", exact: true }).count(), 1);
    const privacy = dialog.locator("#project-case-study section").filter({
      has: page.getByRole("heading", { name: "Report access and privacy", exact: true }),
    });
    assert.equal(
      await privacy.locator("p").count(),
      3,
      "Report access copy needs three readable paragraphs",
    );
    assert.match(await privacy.innerText(), /through their Company membership/);
    assert.match(await privacy.innerText(), /Anyone with that link or code can view the report/);
    assert.equal(
      (await dialog.innerText()).includes(";"),
      false,
      "HearDesk descriptions must not contain semicolons",
    );
    const links = dialog.locator("#project-documents a[download]");
    assert.equal(await links.count(), 4, "Four actual Word downloads required");
    for (let i = 0; i < 4; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute("href");
      const filename = href.split("/").pop();
      const response = await page.request.get(new URL(href, page.url()).href);
      assert.equal(response.status(), 200);
      const bytes = await response.body();
      assert.equal(bytes.subarray(0, 2).toString(), "PK");
      const expected = await readFile(path.join(primary, filename));
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        createHash("sha256").update(expected).digest("hex"),
      );
      const waiting = page.waitForEvent("download");
      await link.click();
      const download = await waiting;
      assert.equal(download.suggestedFilename(), filename);
      assert.equal(await download.failure(), null);
      results.push({
        viewport: width,
        filename,
        status: 200,
        browserDownload: "passed",
        bytes: bytes.length,
      });
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true);
    await dialog.locator("#project-gallery").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#project-gallery img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    assert.equal(await dialog.locator('#project-gallery .media[data-state="error"]').count(), 0);
    await dialog
      .getByRole("heading", { name: "Documentation", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `heardesk-documentation-${width}.png`) });
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    const openerFocused = await page
      .getByRole("button", { name: "View project HearDesk", exact: true })
      .evaluate((el) => el === document.activeElement);
    assert.equal(openerFocused, true, "Closing restores focus to project trigger");
    await page.getByRole("button", { name: "View project Padel Booking", exact: true }).click();
    assert.equal(await dialog.locator("#project-case-study").isVisible(), true);
    assert.equal(
      await dialog.getByRole("heading", { name: "Report access and privacy", exact: true }).count(),
      0,
    );
    assert.match(await dialog.locator("#project-description").innerText(), /simulated checkout/);
    assert.equal(await dialog.locator("#project-documents").isVisible(), false);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "View project KOSÉ Indonesia Website", exact: true })
      .click();
    assert.equal(await dialog.locator("#project-case-study").isVisible(), false);
    assert.equal(await dialog.locator("#project-documents").isVisible(), false);
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    JSON.stringify(
      {
        downloads: results,
        javascriptErrors: 0,
        overflow: false,
        existingProjectRegression: "passed",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
