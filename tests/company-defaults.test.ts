import { afterEach, expect, it, vi } from "vitest";
import { companyDefaults } from "@/server/company-defaults";
afterEach(() => vi.unstubAllEnvs());
it("operator allowance configuration cannot silently turn missing/blank values into zero", () => {
  for (const name of [
    "HEARDESK_DEFAULT_WEBSITES",
    "HEARDESK_DEFAULT_SEATS",
    "HEARDESK_DEFAULT_MONTHLY_REPORTS",
    "HEARDESK_DEFAULT_STORAGE_BYTES",
  ]) {
    vi.stubEnv(name, "");
  }
  expect(() => companyDefaults()).toThrowError(
    expect.objectContaining({ code: "COMPANY_DEFAULTS_MISSING" }),
  );
});
it("validates safe integer limits and preserves BigInt storage precision", () => {
  vi.stubEnv("HEARDESK_DEFAULT_WEBSITES", "2");
  vi.stubEnv("HEARDESK_DEFAULT_SEATS", "3");
  vi.stubEnv("HEARDESK_DEFAULT_MONTHLY_REPORTS", "100");
  vi.stubEnv("HEARDESK_DEFAULT_STORAGE_BYTES", "9007199254740993");
  expect(companyDefaults()).toEqual({
    websiteLimit: 2,
    seatLimit: 3,
    monthlyReportLimit: 100,
    storageBytesLimit: 9007199254740993n,
  });
  vi.stubEnv("HEARDESK_DEFAULT_SEATS", "9007199254740993");
  expect(() => companyDefaults()).toThrow();
});
