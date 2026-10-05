export function validateTestDatabaseUrls(runtime?: string, migration?: string) {
  if (!runtime || !migration) throw new Error("Both test database connections are required.");
  const app = new URL(runtime), operator = new URL(migration);
  if (app.pathname !== "/ureport_test" || operator.pathname !== "/ureport_test" || app.hostname !== operator.hostname || (app.port || "5432") !== (operator.port || "5432")) throw new Error("Both test connections must target the same isolated ureport_test database.");
}
