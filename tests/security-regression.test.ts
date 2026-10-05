import { it, expect } from "vitest";
import { validateTestDatabaseUrls } from "../scripts/test-config";
import { storageAdmission } from "../src/server/storage-admission";
it("rejects a production migration connection during test startup", () => {
  expect(() => validateTestDatabaseUrls("postgresql://test:test@localhost/ureport_test", "postgresql://owner:owner@localhost/ureport")).toThrow();
  expect(() => validateTestDatabaseUrls("postgresql://test:test@localhost/ureport_test", undefined)).toThrow();
  expect(() => validateTestDatabaseUrls("postgresql://test:test@localhost/ureport_test", "postgresql://owner:owner@localhost/ureport_test")).not.toThrow();
});
it("reserves physical free space for simultaneous uploads", () => {
  expect(storageAdmission({ free: 120, floor: 100, reserved: 15, needed: 10, used: 0, quota: 1000 })).toBe(false);
  expect(storageAdmission({ free: 130, floor: 100, reserved: 15, needed: 10, used: 0, quota: 1000 })).toBe(true);
});
