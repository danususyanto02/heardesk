import { expect, it } from "vitest";
import { quotaAvailable, utcPeriod } from "@/modules/usage/domain/quota-policy";

it("report period is UTC calendar month rather than visitor timezone", () => {
  expect(utcPeriod(new Date("2026-10-01T00:30:00+02:00"))).toBe("2026-09");
  expect(utcPeriod(new Date("2026-10-01T00:00:00Z"))).toBe("2026-10");
});
it("reserves capacity and rejects over-limit/negative accounting", () => {
  expect(quotaAvailable(9n, 0n, 1n, 10n)).toBe(true);
  expect(quotaAvailable(9n, 1n, 1n, 10n)).toBe(false);
  expect(quotaAvailable(0n, 0n, 1n, 0n)).toBe(false);
  expect(quotaAvailable(-1n, 0n, 1n, 10n)).toBe(false);
});
