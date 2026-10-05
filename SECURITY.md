# Security

uReport menyediakan private admin endpoints, database-backed sessions, server validation, persistent rate limits, bounded upload requests, image normalization, private file access, and widget origin/framing controls.

## Release status

This workspace is pre-release. No public versions or production deployment are claimed supported yet. Before publishing, the maintainer must define supported release versions and enable a real private vulnerability reporting channel (for example GitHub private vulnerability reporting). No contact address or response SLA is invented here.

Do not post credentials, visitor messages, screenshots, or exploitable details in public issues. Local `.env` files and AI notes are excluded from source control; examples contain placeholders only.

## Deployment responsibility

Use HTTPS, verified database TLS or a private tunnel, restricted database/backend network access, a trusted reverse proxy, private backups, and current dependency/base-image security patches. `TRUST_PROXY=true` requires proxy-overwritten forwarded headers and inaccessible direct backend.

This version targets one application instance/admin/site. It does not include 2FA, malware scanning, distributed denial-of-service protection, or multi-tenant isolation. Client widget keys are public identifiers, not credentials. CSP/CORS do not authenticate anonymous feedback senders.

See `docs/operations/README.md` for backup/recovery/upgrade and the explicit deployment verification gaps.
