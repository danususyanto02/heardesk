import { afterAll, beforeAll, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { companyDatabase } from "../support/company-database";
import { authEmailOptions } from "@/modules/identity/infrastructure/auth-email-options";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const emails: { to: string; subject: string; text: string }[] = [];
const base = "http://localhost:3100";
const email = "verify@example.test";
const password = "Verify-password-2026!";
beforeAll(async () => {
  fixture = await companyDatabase();
});
afterAll(async () => {
  await fixture?.close();
});
function auth() {
  const mail = authEmailOptions({
    send: async (message) => {
      emails.push(message);
    },
  });
  return betterAuth({
    baseURL: base,
    secret: "test-only-identity-secret-32-chars-minimum",
    database: prismaAdapter(fixture.db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 15,
      requireEmailVerification: true,
      sendResetPassword: mail.sendResetPassword,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: mail.emailVerification,
    user: {
      additionalFields: {
        platformRole: { type: ["USER", "PLATFORM_OWNER"], defaultValue: "USER", input: false },
      },
    },
    rateLimit: { enabled: false },
  });
}
function post(endpoint: string, body: object) {
  return auth().handler(
    new Request(base + "/api/auth/" + endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify(body),
    }),
  );
}
it("unverified signup emits local email, denies login until verification and prevents role injection", async () => {
  const signup = await post("sign-up/email", {
    name: "Client",
    email,
    password,
    platformRole: "PLATFORM_OWNER",
    emailVerified: true,
  });
  expect(signup.status).toBe(200);
  const user = await fixture.db.user.findUniqueOrThrow({ where: { email } });
  expect(user.emailVerified).toBe(false);
  expect(user.platformRole).toBe("USER");
  expect((await post("sign-in/email", { email, password })).status).toBe(403);
  expect(emails[0].to).toBe(email);
  const link = emails[0].text.split("\n").find((line) => line.startsWith("http"))!;
  const verified = await auth().handler(new Request(link));
  expect([200, 302]).toContain(verified.status);
  expect((await fixture.db.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);
  expect((await post("sign-in/email", { email, password })).status).toBe(200);
});
it("local password reset accepts token once, revokes sessions and uses generic response for unknown email", async () => {
  const known = await post("request-password-reset", { email, redirectTo: base + "/login" });
  const missing = await post("request-password-reset", {
    email: "missing@example.test",
    redirectTo: base + "/login",
  });
  expect(known.status).toBe(missing.status);
  expect(await known.json()).toEqual(await missing.json());
  const reset = emails.find((message) => message.subject === "Reset your HearDesk password")!;
  expect(reset).toBeTruthy();
  const link = reset.text.split("\n").find((line) => line.startsWith("http"))!;
  const token = new URL(link).pathname.split("/").at(-1)!;
  const newPassword = "Replacement-password-2026!";
  expect((await post("reset-password", { token, newPassword })).status).toBe(200);
  expect((await post("reset-password", { token, newPassword })).status).toBeGreaterThanOrEqual(400);
  expect(await fixture.db.session.count()).toBe(0);
  expect((await post("sign-in/email", { email, password })).status).toBeGreaterThanOrEqual(400);
  expect((await post("sign-in/email", { email, password: newPassword })).status).toBe(200);
});
