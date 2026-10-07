export function validateTestDatabaseUrls(runtime?: string, migration?: string) {
  if (!runtime || !migration) throw new Error("Both test database connections are required.");
  const app = new URL(runtime), operator = new URL(migration);
  for (const connection of [app, operator]) {
    for (const key of connection.searchParams.keys()) {
      if (!["sslmode", "sslrootcert", "sslcert", "sslkey", "application_name", "connect_timeout"].includes(key)) throw new Error("Test connection target overrides are not allowed.");
    }
  }
  if (app.pathname !== "/ureport_test" || operator.pathname !== "/ureport_test" || app.hostname !== operator.hostname || (app.port || "5432") !== (operator.port || "5432")) throw new Error("Both test connections must target the same isolated ureport_test database.");
}
