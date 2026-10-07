import { expect, it } from "vitest";
import { integrationEnvironment } from "../scripts/integration-config";

it("refuses inherited application DB configuration when test env is missing", () => {
  expect(() => integrationEnvironment({})).toThrow();
  expect(() => integrationEnvironment({ DATABASE_URL: "postgresql://localhost/ureport", MIGRATION_DATABASE_URL: "postgresql://localhost/ureport_test" })).toThrow();
});
it("requires both isolated test connections and supplies explicit integration flag", () => {
  const result = integrationEnvironment({ DATABASE_URL: "postgresql://app@localhost/ureport_test", MIGRATION_DATABASE_URL: "postgresql://operator@localhost/ureport_test" });
  expect(result.INTEGRATION_TESTS).toBe("true");
  expect(result.DATABASE_URL).toContain("app@");
  expect(() => integrationEnvironment({ DATABASE_URL: result.DATABASE_URL })).toThrow();
});
