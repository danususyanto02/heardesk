import { afterEach, expect, it, vi } from "vitest";
import { env } from "../src/server/env";

afterEach(() => vi.unstubAllEnvs());

it("reads UREPORT_SETUP_TOKEN without requiring the former variable", () => {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/ureport_test");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(40));
  vi.stubEnv("UREPORT_SETUP_TOKEN", "b".repeat(40));
  vi.stubEnv("BOOTSTRAP_TOKEN", undefined);
  expect(env().UREPORT_SETUP_TOKEN).toBe("b".repeat(40));
});
