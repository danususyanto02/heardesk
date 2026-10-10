import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve("src") } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/integration/**"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "public/widget.js"],
      exclude: ["src/generated/**"],
    },
  },
});
