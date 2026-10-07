import { validateTestDatabaseUrls } from "./test-config";

export function integrationEnvironment(values: Record<string, string>): Record<string, string> {
  validateTestDatabaseUrls(values.DATABASE_URL, values.MIGRATION_DATABASE_URL);
  return { ...values, INTEGRATION_TESTS: "true" };
}
