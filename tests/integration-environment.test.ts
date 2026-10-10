import { expect, it } from "vitest";
import { integrationEnvironment, integrationEnvFile } from "../scripts/integration-config";

it("never includes malformed connection credentials in configuration errors", () => {
  const secret = "synthetic-test-password";
  try {
    integrationEnvironment({
      DATABASE_URL: `postgresql://ci-user:${secret}@::bad/ureport_test`,
      MIGRATION_DATABASE_URL: "postgresql://operator@localhost/ureport_test",
    });
    throw new Error("Invalid configuration accepted");
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("isolated integration test configuration");
    expect(String(error)).not.toContain(secret);
    expect(error).not.toHaveProperty("input");
    expect(error).not.toHaveProperty("cause");
  }
});

it("uses an explicit integration secret-file path without reading inherited database URLs", () => {
  expect(integrationEnvFile({ HEARDESK_TEST_ENV_FILE: "/run/secrets/heardesk-test" })).toBe(
    "/run/secrets/heardesk-test",
  );
  expect(integrationEnvFile({ DATABASE_URL: "postgresql://localhost/ureport" })).toBe(".env.test");
  expect(integrationEnvFile({ HEARDESK_TEST_ENV_FILE: "" })).toBe(".env.test");
});

it("refuses inherited application DB configuration when test env is missing", () => {
  expect(() => integrationEnvironment({})).toThrow();
  expect(() =>
    integrationEnvironment({
      DATABASE_URL: "postgresql://localhost/ureport",
      MIGRATION_DATABASE_URL: "postgresql://localhost/ureport_test",
    }),
  ).toThrow();
});
it("requires both isolated test connections and supplies explicit integration flag", () => {
  const result = integrationEnvironment({
    DATABASE_URL: "postgresql://app@localhost/ureport_test",
    MIGRATION_DATABASE_URL: "postgresql://operator@localhost/ureport_test",
  });
  expect(result.INTEGRATION_TESTS).toBe("true");
  expect(result.DATABASE_URL).toContain("app@");
  expect(() => integrationEnvironment({ DATABASE_URL: result.DATABASE_URL })).toThrow();
});
