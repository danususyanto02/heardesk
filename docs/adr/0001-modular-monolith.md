# ADR-0001: Feature-scoped modular monolith

- Date: 2026-10-05.
- Status: accepted direction by user; implementation pending written-spec/plan review.

## Context

Existing Next.js application mixes Prisma access and business rules in routes/server helpers. SaaS introduces identity, memberships, usage, feedback, and platform authority. Tenant-sensitive rules must be reusable and testable without making every change require a distributed deployment.

## Decision

Keep one Next.js/PostgreSQL deployment. Organize features into domain, application, and infrastructure boundaries, with composition roots and thin route adapters. Use pragmatic SOLID and function-based dependency injection. Preserve pinned stack and incrementally refactor touched vertical slices.

## Alternatives And Trade-Offs

- Flat route-driven code is quicker initially but spreads Company filters and role rules across endpoints.
- Global layer folders impose ordering but separate code that changes together across many directories.
- Microservices add network/operations consistency costs without current deployment evidence requiring them.
- Feature-scoped Clean Architecture adds contracts/adapters and review overhead but centralizes business policies and makes external adapters replaceable.

## Consequences

Inner layers must remain independent of Prisma/Next/Auth types. Architecture tests and scoped repository integration tests are required. Generic base repositories/IoC frameworks are not introduced. Filesystem storage remains single-host until an adapter change is actually needed.
