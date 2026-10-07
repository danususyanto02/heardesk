import { expect, it } from "vitest";
import { feedbackQueryInput } from "@/server/feedback-query";
it("compares ISO timestamps numerically rather than string representation", () => {
  expect(feedbackQueryInput.safeParse({ from: "2026-10-05T00:00:00Z", to: "2026-10-05T00:00:00.001Z" }).success).toBe(true);
  expect(feedbackQueryInput.safeParse({ from: "2026-10-05T00:00:00.000Z", to: "2026-10-05T00:00:00Z" }).success).toBe(false);
});
