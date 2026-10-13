import { chromium } from "@playwright/test";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "diagrams/source");
const output = path.join(root, "diagrams/exported");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1120, height: 900 },
    deviceScaleFactor: 3,
  });
  for (const file of (await readdir(source)).filter((name) => name.endsWith(".html"))) {
    await page.goto(pathToFileURL(path.join(source, file)).href);
    await page.evaluate(() => document.fonts.ready);
    const svg = page.locator("svg");
    const issues = await svg.evaluate((el) => {
      const v = el.viewBox.baseVal;
      return [...el.querySelectorAll("text")]
        .filter((t) => {
          const b = t.getBBox();
          return b.x < 0 || b.y < 0 || b.x + b.width > v.width || b.y + b.height > v.height;
        })
        .map((t) => t.textContent);
    });
    if (issues.length) throw new Error(`Clipped text in ${file}: ${issues.join(", ")}`);
    const exported = await svg.evaluate((el) => el.outerHTML);
    await writeFile(path.join(source, file.replace(".html", ".svg")), exported);
    await svg.screenshot({ path: path.join(output, file.replace(".html", ".png")) });
    console.log("Exported", file);
  }
} finally {
  await browser.close();
}
