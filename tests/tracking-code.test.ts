import { expect, it } from "vitest";
import { trackingHash } from "@/modules/feedback/infrastructure/tracking-code";

it("validates bearer codes before hashing and never accepts report IDs", () => {
  expect(trackingHash("a".repeat(48))).toMatch(/^[a-f0-9]{64}$/);
  expect(trackingHash("a".repeat(48))).not.toBe("a".repeat(48));
  for (const value of ["", "alice", "a".repeat(47), "G".repeat(48), "a".repeat(49)]) {
    expect(() => trackingHash(value)).toThrow("Kode pelacakan tidak valid.");
  }
});
