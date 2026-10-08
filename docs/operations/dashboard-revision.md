# HearDesk dashboard and website revision

Delivered 2026-10-08 after user approved execution.

## Platform

- Full-width content replaces left-aligned 1500px cap; balanced32px gutters, compact table padding.
- Highcharts12.6.0 loaded dynamically on Overview only, accessibility module, UTC7/30/90day aggregated report counts and Company active/suspended chart. Accessible activity list and numeric summaries remain available. No report bodies/files returned to charts.
- Highcharts is evaluation integration, not a grant of free commercial rights. Credits retained. Appropriate license or replacement required before commercial release; see https://www.highcharts.com/license. No license purchase made.
- Users link to account detail. Reason-required suspend/reactivate/revoke sessions with transactional audit. All Platform Owner accounts protected from suspension; no platform role editing.
- accountStatus migration adds ACTIVE/SUSPENDED and session insert trigger. Trigger shares user lock with suspend; Company writes/onboarding recheck account status in transaction; HTTP auth boundaries reject suspended sessions. Signup cannot set accountStatus.

## Pagination

Platform Companies/Usage/Users/Audit, Company Feedback and Website tables accept pageSize10/25/50/100 (default25). SQL skip/take, counts scoped to same search/filter, deterministic ordering, reset page on size change. Platform Company report/month usage aggregation batched for page IDs; first5 user membership previews plus total count; owner previews bounded5.

Not every auxiliary list is a paginated table: Company chooser still fetches memberships for selection; user detail membership preview capped100; inbox website dropdown capped100. These are known bounds, not unlimited table reads. Overview recentCompanies still fetches default page then shows5; optimize dedicated limit5 query if scale demands it. No assertion that every nested relation has full pagination.

## Company experience

Choice uses radio selection, selected blue background/border and text, explicit Open selected Company, opening state, and secondary Create another Company. Suspended Companies disabled. Create Company explanation separates business/team ownership from adding websites.

Websites lists all Company websites using paginated API, usage/allowance, Add website, per-site settings/installation code. URL carries company+site IDs so another tab's selected cookie cannot retarget existing website navigation. Cookie remains landing preference. Settings writes/rotation target explicit Company/site APIs. Inbox has website filter. Company shell adds Switch Company link.

Existing approved beta default3websites is configurable quota, not pricing package; no subscription/billing model implemented.

## Landing

Replaced old self-hosted uReport pitch with English HearDesk headline, concise benefit, try-widget demo, illustrative labeled inbox example, practical workflow, multiwebsite explanation and compact footer. No fake clients/statistics/testimonials. Demo still performs no feedback POST/write; escape/close focus restored. Signup CTA only when enabled local signup; hosted rollout remains separately gated.

## Verification and rollout

62unit/architecture,49real PostgreSQL integration,10production browser tests pass; typecheck/build pass. Tests cover allowed sizes/SQL disjoint pages, aggregated counts, account actions/audit/protected owner, rejected session after suspension, graph buckets/ranges, actual charts,1920px full-width,390px overflow, chooser highlight, website detail/code and two-tab draft isolation, landing demo no write.

Backup before account migration: ignored `backups/heardesk-2026-10-08T04-38-03.542Z` (archive readable,20storage files copied/hash checked). Applied202610080004_user_status to application DB; no destructive reset. New .next-heardesk build started3000,healthready,legacywidget/script200,anoninbox401,audit runtime UPDATE/DELETEfalse. Original account/data/demo remain.

Screenshots inspected: test-results/landing-desktop.png, platform-desktop.png1920wide with both charts loaded. Existing pg query deprecation, Vite extensionless-config warning, occasional Next stream-close/request_failed logs persist; browser suites green, logs not claimed clean. Firefox/Safari/screen-reader not verified.
