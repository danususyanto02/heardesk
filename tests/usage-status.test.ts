import { expect, it } from "vitest";
import { usageStatus } from "@/modules/usage/domain/usage-status";
it("classifies exact 80 and 100 percent boundaries without bigint rounding", () => {
  expect(usageStatus(79n, 100n)).toMatchObject({ state: "normal", percent: 79 });
  expect(usageStatus(80n, 100n)).toMatchObject({ state: "warning", percent: 80 });
  expect(usageStatus(99n, 100n).state).toBe("warning");
  expect(usageStatus(100n, 100n).state).toBe("limit");
  expect(usageStatus(120n, 100n)).toMatchObject({ state: "limit", percent: 120 });
  expect(usageStatus(0n, 0n)).toMatchObject({ state: "disabled", percent: null });
  expect(usageStatus(799999999999999999n, 1000000000000000000n).state).toBe("normal");
});
