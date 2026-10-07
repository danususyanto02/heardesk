# HearDesk Company Migration

2026-10-06: application database migrated with explicit owner approval. Current localhost:3000 runs `.next-heardesk` standalone build. Backup `backups/heardesk-2026-10-05T12-27-09.291Z` includes PostgreSQL custom archive, storage copy and manifest; restored to temporary local PostgreSQL 16.15 with all eight legacy table hashes/counts matching. Temporary restore server subsequently stopped.

Initial Company: existing administrator owns Company and holds PLATFORM_OWNER. Beta limits: 3 websites, 5 seats, 1,000 reports per UTC calendar month, 1 GiB storage. Runtime grants verified, AuditEvent update/delete revoked despite inherited default grants. Widget public key/registered-origin CSP and 12 storage files preserved; health ready, old widget/script 200, anonymous inbox 401. Public signup remains disabled.

## Required rollout sequence

1. Review `prisma/migrations/202610050003_companies/migration.sql` and Company-isolation tests.
2. Stop application writes in an approved maintenance window; back up database and private storage together. Record restore procedure and verify backup readability.
3. Select initial Company website/seat/monthly report/storage limits. Migration initializes them to 0 intentionally, blocking new allocation until operator configuration.
4. Supply migration-role credentials through operator environment. Set `HEARDESK_MIGRATION_APPROVED=true` only after explicit approval, then run `npm.cmd run db:migrate`. Compose forwards this flag to its migration service.
5. Apply chosen values to initial Company's CompanyLimits with reviewed operator procedure; configure `HEARDESK_DEFAULT_WEBSITES`, `HEARDESK_DEFAULT_SEATS`, `HEARDESK_DEFAULT_MONTHLY_REPORTS`, `HEARDESK_DEFAULT_STORAGE_BYTES` for future onboarding. Empty defaults are rejected. No paid package is implied.
6. Verify runtime grants on added tables and Site sequence. Test runner grants for isolated schemas are not proof of deployment privileges.
   Fresh installs can run `rollout-company.ts provision` with approved operator environment before any Company exists; audit write/edit grants do not depend on legacy Company setup.
7. Deploy new binary, then check fresh login, Company's existing reports/notes/screenshots, original snippet key, usage and health before resuming writes.

Never reset or clean application database using test scripts. Public signup remains disabled until remaining Phase A/B checks and email configuration are complete.

## Compatibility / rollback

- Existing user/site/report IDs, widget key, and attachment file key are preserved by backfill.
- Existing installation admin receives PLATFORM_OWNER and OWNER membership in initial Company.
- CompanyProfile and global StorageBudget locks order Company first, then global storage lock.
- Do not run old binary after multiple Companies are admitted. Rollback before new public writes restores DB/private files/old binary together; after public writes, use reviewed data-preserving forward repair.
- `HEARDESK_BUILD_DIR=.next-heardesk` allows separate new build verification without replacing running old standalone directory. This is a local migration aid, not automatic rollout.

## Pending release gates

Production transport/HTTPS, full membership/seat lifecycle, remaining isolation/storage coverage and later SaaS dashboards. Local rollout backup/restore, runtime grants and initial limits are verified. See `docs/features/heardesk-saas/TODO.md`.

Quota foundation now includes tested seat reservation/accept/revoke and Company/global upload allocation plus reconciliation. Email/Team UI and Company context switching are later-phase work; no claim of full SaaS release readiness.
