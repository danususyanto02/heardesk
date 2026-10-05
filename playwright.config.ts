import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", workers: 1, timeout: 180000,
  use: { baseURL: "http://localhost:3100", headless: true, trace: "retain-on-failure", launchOptions: process.platform === "win32" ? { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" } : {} },
  webServer: [{ command: "node --import tsx scripts/test-server.ts", url: "http://localhost:3100/api/health", timeout: 120000, reuseExistingServer: false }, { command: "node --import tsx scripts/test-host.ts", url: "http://localhost:3200", reuseExistingServer: false }],
});
