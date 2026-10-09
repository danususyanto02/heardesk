import { createLocalEmailSender } from "@/modules/identity/infrastructure/local-email-sender";
import type { EmailSender } from "@/modules/identity/domain/email";

export function emailSender(): EmailSender {
  if (process.env.HEARDESK_EMAIL_MODE !== "local") {
    throw new Error("Email transport is not configured.");
  }
  return createLocalEmailSender(process.env.HEARDESK_EMAIL_DIR ?? "storage/mailbox");
}
