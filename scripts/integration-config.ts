import { validateTestDatabaseUrls } from "./test-config";

export function integrationEnvFile(values: Record<string, string | undefined>): string {
  return values.HEARDESK_TEST_ENV_FILE || ".env.test";
}

export function integrationEnvironment(values: Record<string, string>): Record<string, string> {
  try {
    validateTestDatabaseUrls(values.DATABASE_URL, values.MIGRATION_DATABASE_URL);
  } catch {
    throw new Error(
      "Invalid isolated integration test configuration. Check both ureport_test connections.",
    );
  }
  return { ...values, INTEGRATION_TESTS: "true" };
}
