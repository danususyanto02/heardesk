# Local email for HearDesk development

Selected by owner while hosted onboarding is developed. This adapter writes email JSON privately to `storage/mailbox`; it does not deliver to customer addresses. `.env` selects `HEARDESK_EMAIL_MODE="local"` and `HEARDESK_EMAIL_DIR="storage/mailbox"`.

Email JSON contains recipient, subject, text, timestamp and local-only delivery marker. Text may include verification/reset tokens. Keep files private; do not upload, commit, log, or expose mailbox through a public route. Storage directory is ignored and outside Next public assets. Backup contains mailbox if one exists, so treat backup as sensitive too.

Operator can read local files manually during development. Local signup is available at `/signup` only when `HEARDESK_LOCAL_SIGNUP=true`, APP_URL is loopback, local email capture is enabled, and installation setup has completed. Hosted/public signup remains disabled. Better Auth verification/reset callbacks are wired, and isolated tests cover verification before login, immutable platform role/verified fields, generic reset-request response, single-use reset and session revocation.

Local flow: `/signup` -> private captured verification link -> `/verify-email` -> `/login` -> `/companies` -> website settings. Recovery pages: `/forgot-password`, `/reset-password`. Invalid/expired verification callbacks retain resend action. Local mailbox path is resolved absolutely before standalone startup so files remain in project's configured inbox, not its build folder.

Before public SaaS signup, implement approved onboarding screens/Company creation and replace local delivery with configured real email adapter; verify sender domain and delivery, retry/rate limits, expiry links and account recovery on deployed HTTPS host. Email provider swap uses EmailSender port, not changes to Company business rules.
