# SonarQube remediation and readability

## Baseline

Project key: `danususyanto02_heardesk_751d486e-8f66-4def-9ce4-25b923189f34`.
MCP baseline: `master`, analysis at 2026-10-09 06:53:19 UTC, 185 OPEN issues.
Changes are local on `dev`; no commit, push, or remote issue resolution was requested.
Local lint is not a replacement for a new SonarQube analysis.

## Readability

Prettier provides two-space indentation and a 100-character wrapping target.
ESLint enforces explicit control-flow braces, separate variable declarations,
and no nested ternaries across source, scripts, tests, and the widget loader.
Both checks run in CI. Babel's syntax parser avoids depending on a TypeScript
compiler API unsupported by the pinned TypeScript 7 package.

Seed orchestration delegates to Company, member, website, report, note, and
audit helpers within the original advisory-locked transaction. Architecture
checking separates dependency classification from AST traversal. Error mapping,
image processing, calendars, and inbox/auth rendering have focused helpers.

## Corrections to earlier changes

- Error-code lookup must use own properties. `constructor`, `toString`, and
  `__proto__` must not produce a successful response. Regression tests failed
  against the earlier lookup and pass with `Object.hasOwn`.
- Suspended Company access retains its authorization-denial message; visitor
  submission errors retain their separate message. A regression test covers both.
- Invitation email validation no longer uses the ambiguous backtracking regex.
  Bounded string scans preserve the existing policy; this is deliberately not a
  new stricter RFC email policy. Timing thresholds were removed from unit tests
  because scheduler timing is not a stable correctness assertion.
- FormData email values are narrowed to strings rather than coerced from Files.

## Second scan and fixes

User scan at 2026-10-09 11:57:12 UTC analyzed commit `6012551`, reporting
61 active issues (185 previously). Quality Gate failed on 57 new issues and
0% new-code coverage. No Critical issue remained.

- S2245: widget now chooses a sequential DOM ID, skipping IDs already in the
  page. No crypto/randomness is needed for an element ID. Server cleanup uses
  `randomInt(50) === 0`, preserving the 2% sampling policy.
- S6819: action notifications use native output elements with polite live
  announcements. Skeleton announcements are separate from decorative shapes.
  Inbox filter uses an open native dialog without `showModal()`, preserving
  non-modal outside dismissal and keyboard navigation.
- S1082/S6847: landing demo uses native `closedby="any"` for backdrop dismissal.
  Production Chromium tests verify backdrop, Escape, and explicit close controls.
  Older browsers without light-dismiss support retain Escape/close controls.
- S6564: redundant ID and active-widget aliases were removed; descriptive
  property names remain and authorization's branded scope is preserved.
- S6772: label text is wrapped explicitly in spans, rather than relying on JSX
  whitespace. Helper props are readonly; identical filter handlers are shared.
- S4666: obsolete analytics globals were removed; active selector duplicates
  were consolidated while retaining important declarations and media overrides.

## Coverage

Run `npm run test:coverage` for unit LCOV, or `npm run test:coverage:all` for
unit and database integration LCOV. Integration runs use the existing isolated
test-database runner. Reports are `coverage/lcov.info` and
`coverage/integration/lcov.info`; both are configured in `sonar-project.properties`.
The existing CI generates and uploads unit LCOV. A scanner in a different job
must download the artifact before analysis; an external scanner must first run
the coverage command in the same checkout.

Measured separately across all source/scripts/widget, excluding only generated
Prisma: unit line coverage 10.01%, integration line coverage 21.08%. These values
must not be added together: the scanner combines per-file line hits from both
reports. Browser E2E coverage is not included. An 80% new-code gate is not yet
verified or claimed; it needs real coverage expansion, not business-code exclusions.

Screen-reader speech and cross-browser accessibility still require manual
validation. Browser regression tests cover keyboard filter dismissal, focus,
loading states, and desktop/mobile layout.

## Verification

Fresh verification on 2026-10-09:

| Check                                             | Result                                            |
| ------------------------------------------------- | ------------------------------------------------- |
| `npm run typecheck`                               | Passed                                            |
| `npm test`                                        | 75 passed across 25 files                         |
| `npm run test:integration`                        | 53 passed across 19 files, isolated test database |
| `HEARDESK_BUILD_DIR=.next-heardesk npm run build` | Passed                                            |
| Production Playwright suite                       | 15 passed                                         |
| `npm run format:check`                            | Passed                                            |
| `npm run lint`                                    | Passed                                            |
| `npm audit`                                       | 0 vulnerabilities                                 |
| Final code review                                 | No findings after corrections                     |
| Standalone health                                 | `ready`, `.next-heardesk/standalone/server.js`    |

Browser suite exercised auth, Company isolation, export, filter keyboard behavior,
widget, empty/loading/error states, and desktop/mobile views. Existing Vite config,
pg query deprecation, and Next destination-stream warnings remain in test logs.

Second-round verification: 75 unit and 53 integration tests passed with coverage,
production build passed, production E2E 15 passed after the skeleton locator was
updated for separate native announcements. Widget collision and native backdrop
dismissal assertions also passed. Server restarted from `.next-heardesk`, health ready.
Lint/typecheck passed. Scan of these second-round changes is pending; no remote
issue was marked resolved and no remote zero-issue or 80% coverage claim is made.

Final checks: format/lint/audit passed (0 vulnerabilities); independent diff
review returned no findings. CSS parser found 0 duplicate selectors within the
same scope. `test-results/inbox-filter-mobile.png` was inspected at 390px:
native non-modal filter remains anchored, with visible controls and no overflow.

## Jenkins automatic scanning

The repository `Jenkinsfile` adapts the existing Jenkins Pipeline Script, keeping
`github-heardesk`, `SonarScanner`, `SonarQube-WSL`, and the `master` checkout.
The build agent needs Git and Java. Configure the Jenkins NodeJS plugin with a
tool installation named `NodeJS-22`, automatic installation enabled, and a Node
22.x release at least 22.18.0. The first `Prepare Node.js` stage resolves that
installation explicitly through the Jenkins `tool` step and adds its `bin`
directory to PATH for subsequent stages. It prints the selected directory and
checks `command -v node` and `command -v npm`. Host/WSL Node installations are
not assumed visible inside a Jenkins agent or container. If Console Output
starts directly with `Check Environment`, the job is still executing an older
pipeline definition; inspect its saved Pipeline Script or SCM script revision.

Stages install locked development dependencies, generate Prisma Client, run
unit coverage, verify a nonempty LCOV file, and scan in the same workspace.
Prisma generation uses a placeholder URL and does not migrate or connect to a
database. Integration coverage is not run: the provided job has no isolated
test-database credentials/configuration. The scanner explicitly imports only
the fresh unit LCOV report; stale integration coverage cannot be imported.

Project identity and source/test scope come from `sonar-project.properties`.
The earlier `-Dsonar.sources=.` and command-line exclusions are removed so they
cannot override the repository's source/test separation and generated-code
exclusions. The pipeline checks the Quality Gate with scanner polling, which
does not require configuring a Jenkins webhook. A failed gate fails the build;
successful report submission alone is not reported as a successful gate.

For a job currently using Pipeline Script, copy the `Jenkinsfile` content into
that field, or change the definition to Pipeline script from SCM and use script
path `Jenkinsfile`. Changes must be present in the checked-out `master` revision,
including the coverage dependency, npm script, lockfile, and Sonar properties.
No local manual coverage command is required for this pipeline.

Importing coverage corrects the missing report; it does not raise actual unit
coverage to 80%. The existing gate may continue failing on coverage or issues.
