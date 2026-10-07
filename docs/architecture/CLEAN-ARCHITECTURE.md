# HearDesk Clean Architecture and SOLID

Status: accepted direction; implementation incremental from next approved code task. Current code has not yet been restructured. Related: [SaaS SPEC](../features/heardesk-saas/SPEC.md), [ADR-0001](../adr/0001-modular-monolith.md).

## Structure

Use a feature-scoped modular monolith:

```text
src/modules/<feature>/
  domain/             values, business policies, errors, narrow ports
  application/        use cases, authorization sequencing, orchestration
  infrastructure/     Prisma/auth/email/storage adapter implementations
src/server/composition/  construction of adapters/use cases
src/app/                 Next.js routes/pages, input/output adapters
src/components/          presentation and user interactions
```

Modules: identity, companies, websites, feedback, usage, platform. Add a module only for a distinct business responsibility; do not split every function into a new package.

## Dependency Rules

1. Domain imports only its own framework-free values and deliberately shared pure contracts.
2. Application imports domain and narrow public contracts of other modules; never another module's infrastructure.
3. Infrastructure imports application/domain plus libraries required for implementing ports.
4. App/composition wire adapters and invoke use cases. UI never decides server authority.
5. Domain/application do not import Prisma/generated Prisma, Next.js/React, Better Auth, Zod, Sharp, node filesystem/http, environment modules, or infrastructure. Convert their types at the boundary.
6. No ambient singleton DB/session state inside use cases. Inject repository, transaction, clock, key generator, email/image/storage ports only where needed.
7. Keep exported interfaces small; ports encode required ownership/transaction behavior, not all methods of a library.

## Tenant Access

- Company context is produced by current session + membership + Company status + permission checks, never cast from request body.
- Repository lookup/mutation requires Company context and scopes SQL by Company relationships. Avoid global entity lookups followed by optional ownership checks.
- Platform uses a distinct projection repository that cannot return customer message content or private attachments.
- Transactions that alter roles, suspension, quotas, or scoped data share explicit serialization rules. Authorization outside a transaction alone is insufficient for protected writes.
- Public widget resolves key to Site/Company server-side; public key is not a credential.

## Pragmatic SOLID

| Principle | Rule |
| --- | --- |
| SRP | Split code when responsibilities have different reasons to change; keep one use case per coherent action |
| OCP | Replace external adapters through stable ports; avoid speculative plugin frameworks |
| LSP | Fake and production ports share missing-resource, Company-scope, and transaction contracts |
| ISP | Prefer focused FeedbackReader/FeedbackWriter/EmailSender contracts to a giant generic repository |
| DIP | Inner use cases depend on business contracts; infrastructure satisfies those contracts |

Functions/plain objects are valid implementations. Classes are optional. No IoC container, generic BaseRepository, universal entity framework, or interface for a trivial pure helper by default. DRY must not collapse distinct authorization rules into an unsafe generic shortcut.

## Example Responsibilities

`change-feedback-status` authorizes feedback:status within Company transaction, loads a Company-scoped report, validates NEW/REVIEWING/DONE/ARCHIVED, persists and returns a safe DTO. HTTP adapter handles Zod/body/origin/session/response. Prisma adapter performs filtered SQL; neither HTTP Request nor Prisma row type enters the use case signature.

`submit-feedback` resolves widget key, checks active Company, deduplicates, obtains usage/storage reservation, validates image through a port, commits report/accounting, and releases staged resources on failure. Existing image/physical-capacity controls stay in infrastructure and remain regression-tested.

## Verification

- Add import-boundary test for inner layers, aliases/re-exports included.
- Unit-test nontrivial permission/owner/usage policies using injected clock and narrow fakes.
- Integration-test real PostgreSQL scope and concurrency; fake tests cannot prove SQL isolation.
- Exercise public auth-plugin mutation routes to prove app wrappers are not the only protection.
- E2E-test separate Companies, stale Company responses, private attachments, revoked membership, and roles.
- Migrate vertical slices as changed; old src/server helpers may temporarily exist as adapters. Mark exceptions explicitly and remove them in the owning task.

## Operational Boundaries

No secrets in documents/logs. Tests target only validated ureport_test. Database migration and rollout use operator privileges, not runtime credentials. Commit/push only on explicit request; no repository creation as part of architecture work.
