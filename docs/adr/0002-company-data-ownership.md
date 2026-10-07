# ADR-0002: Company owns feedback; platform authority is separate

- Date: 2026-10-05.
- Status: Company ownership approved by user; detailed permission/operational defaults pending written review.

## Context

User wants HearDesk to serve multiple client companies with team roles and a distinct platform-owner dashboard. Owning reports by account would make employee turnover and shared processing difficult; giving platform role implicit inbox access would conflate operation and customer work.

## Decision

Company owns Site, and feedback/notes/attachments inherit ownership from Site. Account membership grants Company-scoped Owner/Admin/Agent/Viewer. Platform Owner is a separate server-controlled authority used for metadata operations. Platform Owner requires ordinary Company membership to read its reports. All website access is Company-wide in MVP.

Use explicit Company-scoped repository contracts and transactional access checks. Auth organization tables are the identity/membership source of truth when installed-version verification succeeds. Do not rely on the organization plugin to filter application tables.

## Alternatives And Trade-Offs

- Account ownership simplifies onboarding but blocks durable team ownership and introduces transfer complexity for each resource.
- Website-level membership enables finer restrictions but adds an independent ACL model; outside first release.
- Automatic platform access eases support but increases customer-data exposure. Separate metadata projections reduce exposure; support access becomes a separately approved feature.
- Shared PostgreSQL with scoped repositories is simpler to operate than database-per-Company; a missing filter is serious, so structural ports, SQL tests, and authorization regression gates are mandatory. RLS is possible later, not a claimed existing safeguard.

## Consequences

Migration must give old records an initial Company and preserve keys/IDs. Roles are per membership. Suspension and revocation affect subsequent requests. Platform/customer dashboards share login but not authority. Switching Company clears old screen/cache context. No automatic cross-Company content export or impersonation.
