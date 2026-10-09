import { expect, it } from "vitest";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalEmailSender } from "@/modules/identity/infrastructure/local-email-sender";
import { authEmailOptions } from "@/modules/identity/infrastructure/auth-email-options";
it("captures local email privately without exposing token-bearing links in console", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "heardesk-email-"));
  try {
    const sender = createLocalEmailSender(directory);
    await sender.send({
      to: "client@example.test",
      subject: "Verify your HearDesk email",
      text: "http://localhost:3000/api/auth/verify-email?token=local-secret",
    });
    const files = await readdir(directory);
    expect(files).toHaveLength(1);
    const email = JSON.parse(await readFile(path.join(directory, files[0]), "utf8"));
    expect(email.to).toBe("client@example.test");
    expect(email.text).toContain("token=local-secret");
    expect(email).toHaveProperty("createdAt");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
it("verification and reset callbacks preserve destination without logging link", async () => {
  const emails: { to: string; subject: string; text: string }[] = [];
  const options = authEmailOptions({
    send: async (message) => {
      emails.push(message);
    },
  });
  await options.emailVerification.sendVerificationEmail({
    user: { email: "client@example.test" },
    url: "https://heardesk.test/verify?token=verify",
  });
  await options.sendResetPassword({
    user: { email: "client@example.test" },
    url: "https://heardesk.test/reset?token=reset",
  });
  expect(emails.map((message) => message.subject)).toEqual([
    "Verify your HearDesk email",
    "Reset your HearDesk password",
  ]);
  expect(emails[0].text).toContain("token=verify");
  expect(emails[1].text).toContain("token=reset");
});
