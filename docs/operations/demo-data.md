# HearDesk dashboard demo seed

Run `npm.cmd run db:seed:demo` from project root to seed current configured ureport application database. Verify without writing using `npm.cmd run db:seed:demo -- --verify`.

Dataset is illustrative, labeled `(Demo)` on Companies/websites/users and `[Demo]` on reports/notes/audit reasons. Emails and origins use reserved `.example.test` addresses. No credential accounts/passwords are created for demo identities; they cannot sign in. Existing installation Platform Owner gains OWNER membership in each demo Company for preview purposes only.

| Company | Status | Websites | Team demo users | Reports |
| --- | --- | --- | --- | --- |
| Northstar Commerce (Demo) | Active | 2 | Admin/Agent/Viewer | 12 |
| Paperplane Studio (Demo) | Active | 2 | Admin/Agent/Viewer | 12 |
| Orbit Learning (Demo) | Active | 2 | Admin/Agent/Viewer | 12 |
| Harbor Booking (Demo) | Suspended | 2 | Admin/Agent/Viewer | 12 |

Each Company has mixed issue/suggestion/compliment and NEW/REVIEWING/DONE/ARCHIVED reports, optional reserved-domain sender email, 3 notes, and 2 illustrative administrative audit events. Website/team/report/storage limits vary. Screenshot storage remains 0 because no screenshot files are fabricated. Report accounting uses actual createdAt UTC period, so recent demo history can span month boundary.

Platform preview: `/platform/overview`, `/platform/companies`, `/platform/users`, `/platform/usage`, `/platform/audit`. Open Company Dashboard -> choose an active demo Company -> Laporan for seeded inbox. Harbor remains suspended deliberately to demonstrate status; reactivate through platform detail if needed.

IDs are namespaced `heardesk-demo-*`; Company metadata marks dataset ownership. Seeding is transactional and serialized, idempotent, and preserves existing Company/site/key/report edits and original records. It adds only missing demo entities; report counters increment only on new reports. Existing note/audit IDs are not overwritten; runtime audit INSERT-only permissions supported. Seed checks installation owner is verified PLATFORM_OWNER, does not escalate other accounts. No automatic cleanup or reset provided, avoiding deletion of later user edits.

Verification on 2026-10-06: 3 isolated PostgreSQL seed tests pass (create/accounting/idempotency/preservation/platform authority); full unit suite60 passes, typecheck passes. Live seed verified4DemoCompanies/8sites/12demoUsers/48reports/12notes/8demoAuditEvents; app health ready. Existing records remain alongside seeded ones.
