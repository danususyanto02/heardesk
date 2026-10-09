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

## Context-dependent findings

- S2245: widget randomness identifies a DOM iframe for `aria-controls`; rate-limit
  randomness samples cleanup after enforcement. Neither value is a credential
  or authorization decision. Comments document this; no remote issue was closed.
- S6819: existing `role="status"` nodes communicate loading/action state rather
  than calculation output. The non-modal inbox filter retains `role="dialog"`,
  portal positioning, outside dismissal, and keyboard behavior. Do not replace
  it with `showModal()` solely to satisfy a static rule. Native export/demo
  dialogs retain Escape and explicit close controls.
- S1082/S6847: landing's dialog click listener dismisses pointer clicks outside
  its bounds. It is not a keyboard-only action; native Escape and close controls
  provide keyboard dismissal. Do not assign button semantics to the dialog.
- S6564: CompanyId, UserId, and WebsiteDetail are domain vocabulary aliases.
  They are retained intentionally; no nominal type-safety claim is made.

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

MCP checked again after verification: only `master` analysis at
2026-10-09 06:53:19 UTC is available. No tool in the connected MCP starts a scan.
New SonarQube analysis of this revision is still pending; no issue-count reduction
or final Cognitive Complexity values are claimed.
