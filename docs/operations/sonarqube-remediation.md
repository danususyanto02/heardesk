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
exclusions. Per the project owner's request, `sonar.qualitygate.wait=false` makes
this an analysis/reporting job: successful tests and report submission allow
Jenkins SUCCESS. Quality Gate remains independently visible in SonarQube and
can still fail. Environment, test, and scanner execution failures still fail
the job; no exit codes are swallowed and no server gate thresholds are changed.

For a job currently using Pipeline Script, copy the `Jenkinsfile` content into
that field, or change the definition to Pipeline script from SCM and use script
path `Jenkinsfile`. Changes must be present in the checked-out `master` revision,
including the coverage dependency, npm script, lockfile, and Sonar properties.
No local manual coverage command is required for this pipeline.

Importing coverage corrects the missing report; it does not raise actual unit
coverage to 80%. The existing gate may continue failing on coverage or issues.

## 2026-10-10 execution

Latest remote baseline: `master`, analysis `2026-10-10T04:34:15Z`.
57 open code smells, 28 on new code, 0 bugs, 0 vulnerabilities, 0 security
hotspots. New-code coverage 10%; duplication 0%. Gate ERROR for new issues and
coverage. Local fixes require another analysis before remote counts can change.

- Replaced deprecated Phosphor aliases with canonical `Icon` exports, preserving
  existing SVG props and appearance. Replaced form-submit event types with
  `React.SubmitEvent<HTMLFormElement>`.
- Replaced Zod instance flattening with `flattenError(error).fieldErrors`.
  Characterization tests preserve nested field errors, form-level errors,
  response status, request ID, and private response headers.
- Simplified demo website creation with lazy `??=`; existing website data and
  keys remain untouched on seed reruns.
- Added React component tests with jsdom 26.1.0, React Testing Library 16.3.3,
  and DOM Testing Library 10.4.2, all compatible with Node 22.18.0. Test discovery
  now includes `.test.tsx` while PostgreSQL tests remain separately guarded.
- Added request-level PostgreSQL tests for Company website/detail/statistics/
  export/key/note routes, visitor multipart validation, idempotency, private
  image normalization, failed-image cleanup, and legacy website scope.
- Screenshot tests own a temporary storage directory, removed in teardown even
  when assertions fail. They never use application storage.
- Configuration failures from integration secret files are sanitized; malformed
  URL credentials are never attached to thrown errors or printed by the runner.

### Enable integration coverage in Jenkins

Create a Jenkins **Secret file** credential containing the isolated test
configuration. Use the same required non-secret settings as local `.env.test`
(see `scripts/test-config.ts` and `src/server/env.ts`), with both `DATABASE_URL`
and `MIGRATION_DATABASE_URL` targeting the same dedicated `ureport_test` host,
port and database. Runtime and migration roles may differ. Do not use the
application database or the Prisma-generation placeholder connection.

Copy the complete current `Jenkinsfile` into a Pipeline Script job, or use it
through Pipeline script from SCM. Set build parameter
`INTEGRATION_ENV_CREDENTIAL_ID` to that Secret file credential ID. Binding exposes
only its temporary path as `HEARDESK_TEST_ENV_FILE`; the runner reads that file,
validates it, and passes values to Vitest. Local default remains `.env.test`.

With the parameter empty, integration stage is skipped and only unit LCOV is
imported. With it supplied, integration failures fail the job and scanner imports
both fresh LCOV files. Unit stage removes all prior coverage first. Neither
credential contents nor environment dumps should be logged.

### `closedby` analyzer finding

Issue `64c46844-6976-4de3-a5f3-ebd90255350f`, rule `typescript:S6747`, reports
`src/components/landing.tsx:172` as an unknown property. `closedby="any"` is a
documented HTML dialog attribute and the installed React types accept it.
Production Chromium E2E verifies Escape, backdrop dismissal, close button,
focus restoration and mobile layout. Preserve native behavior; owner can review
and mark this issue False Positive with this evidence. No remote issue status
or rule configuration was changed.

Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog

### Verification and remaining coverage

Production build succeeded in `.next-sonar` and all 15 production E2E tests
passed. Main `.next-heardesk` build was locked by an existing process, so a
separate ignored output directory was used. Route types for normal output were
regenerated after verification. Existing pg concurrent-query warnings and Next
destination-stream errors still appeared in E2E logs; test results were green.

Coverage excludes generated Prisma only. Component and integration reports
measure different execution paths and must be merged by file/line, never by
adding percentages. The 80% new-code threshold remains unchanged. Further tests
are needed for operational scripts, authentication/proxy, server adapters and
uncovered branches. Actual new-code coverage and issue closure require Jenkins
analysis on the resulting revision.

Final local verification for this execution:

- 254 unit/component tests across 52 files passed.
- 87 PostgreSQL integration tests across 25 files passed.
- Unit report: lines 53.60%, branches 54.73%.
- Integration report: lines 38.77%, branches 31.75%.
- Union of LCOV records by normalized file/line: 2,356/2,832 lines (83.19%).
  Union of branch records: 1,461/1,902 conditions. Combined local denominator:
  3,817/4,734 (80.63%). This is an overall LCOV calculation, not SonarQube's
  new-code metric; Sonar's executable-line mapping and new-code scope may differ.
- Typecheck, ESLint, Prettier check, diff whitespace check passed.
- Production dependency audit: 0 vulnerabilities.
- Fresh-context review found configuration-log leakage, shared screenshot
  storage, and date-dependent export fixture. All three were addressed:
  malformed credential regression RED to GREEN, temporary-storage teardown,
  fixed report timestamp with workbook count assertions.

No commit, push, Jenkins credential creation, scan trigger, or remote issue
resolution was performed. Remaining operational step: owner supplies isolated
test Secret file, updates Pipeline Script from the complete Jenkinsfile, and
scans the revision containing these changes. Valid `closedby` finding awaits
owner-approved false-positive disposition or analyzer support.
