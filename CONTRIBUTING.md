# Contributing

Use Node.js24 and an isolated PostgreSQL development/test database. Install from lockfile with `npm ci`. Do not use another application's database for schema development, resets, or fixtures.

Before proposing a change run unit tests, typecheck, production build, and dependency audit. Integration/browser tests use `ureport_test` and require both runtime and migration connection URLs pointing at that database. The test runner validates both targets before migrations and cleanup.

Commit migrations with schema changes. Runtime database credentials must not have migration privileges. Never commit `.env`, upload files, visitor messages/screenshots, database backups, or AI planning notes.

Keep Indonesian controls specific, labels keyboard-accessible, and every view complete with loading/empty/error/success handling. Auth/authorization is enforced server-side, independently of UI redirects. Public widget has no admin cookies or visitor login.

The project owner has not yet selected a distribution license. Resolve licensing before accepting external contributions or publishing a public release. Security disclosure policy is documented in `SECURITY.md`.
