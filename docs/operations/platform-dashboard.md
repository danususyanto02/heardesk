# HearDesk Platform Owner Dashboard

## Access

Open `/login` with the existing installation-owner account. Login navigates through `/dashboard`: PLATFORM_OWNER lands at `/platform/overview`; a client lands at `/companies`. Existing authenticated owners can open `/platform/overview` directly.

Platform pages and APIs recheck fresh authenticated identity and persisted platform role. Client Company Owner/Admin/Agent/Viewer cannot use platform APIs. Anonymous API access returns 401 and platform pages redirect to login. Platform authority never grants customer inbox access; ordinary membership is still required there.

## Views

- Overview: real counts of Companies by status, users, websites, stored reports and committed screenshot bytes; five recently created Companies.
- Companies: paginated/searchable account metadata, owners, status, site/report counts and detail link.
- Company detail: reason-required suspension/reactivation and Company allowances (websites, seats, UTC-month reports, bytes).
- Users: account identities, verification state, platform role and Company memberships; no platform-role assignment control.
- Usage: committed counts/bytes against Company limits. Pending invitations reserve seats in admission logic, but this view labels members explicitly rather than claiming total reserved seats.
- Audit Log: administrative action, Company name, actor snapshot, safe reason and UTC timestamp; immutable through app APIs.

Company status/allowance writes lock CompanyProfile, recheck current platform user, compare expected profile timestamp, and append audit atomically. Stale changes return 409. Lowering allowances preserves existing data. Suspension pauses Company requests/new visitor submissions; data remains stored. Unsaved allowance drafts survive a status change; reload saved allowances explicitly before submitting a draft against changed version.

Metadata projections exclude visitor email, message, page URL, screenshot bytes/storage key, fingerprints, widget key and internal notes. Account-owner/user email is operational metadata and intentionally available to Platform Owner.

## Verification

2026-10-06: 60 unit/architecture tests, 41 PostgreSQL integration tests, 10 production E2E pass; typecheck/build pass. Browser tests exercise navigation, platform login landing, Company-vs-platform rejection, foreign-origin mutation rejection, CAS conflict, status/allowance/audit flow, draft preservation, 390px mobile overflow and Company Dashboard link. Screenshots: ignored `test-results/platform-desktop.png` and `platform-mobile.png`.

Live smoke: app health ready, old widget/script 200, anonymous Company/platform APIs 401, anonymous platform page redirects to login, runtime AuditEvent UPDATE/DELETE denied. No schema migration needed for dashboard.

Known verification gaps: screen reader and Firefox/Safari not tested. Production suite emitted existing pg concurrent-query deprecation and occasional Next destination-stream-closed/request_failed logs during navigation; no failed browser test, but logs are not claimed clean.
