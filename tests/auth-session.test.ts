import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { currentActor, getAuth, requireActor, requireAdmin } from "@/server/auth";
const dependencies = vi.hoisted(() => ({
  session: vi.fn(),
  user: vi.fn(),
  installation: vi.fn(),
  config: vi.fn(),
}));
vi.mock("better-auth", () => ({
  betterAuth: (config: unknown) => {
    dependencies.config(config);
    return { api: { getSession: dependencies.session } };
  },
}));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: () => ({}) }));
vi.mock("@/modules/companies/infrastructure/auth-organization-plugin", () => ({
  companyOrganizationPlugin: () => ({}),
}));
vi.mock("better-auth/api", () => ({
  createAuthMiddleware: (handler: unknown) => handler,
  APIError: class extends Error {},
}));
vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: dependencies.user },
    installation: { findUnique: dependencies.installation },
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/ureport_test");
  vi.stubEnv("APP_URL", "https://feedback.test");
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("UREPORT_SETUP_TOKEN", "y".repeat(32));
  vi.stubEnv("HEARDESK_EMAIL_MODE", "disabled");
  dependencies.session.mockResolvedValue({ user: { id: "u1" } });
  dependencies.user.mockResolvedValue({
    id: "u1",
    emailVerified: true,
    platformRole: "USER",
    accountStatus: "ACTIVE",
  });
  dependencies.installation.mockResolvedValue({ adminId: "u1" });
  dependencies.config.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("checks live account status before returning identity", async () => {
  expect(await requireActor()).toEqual({ userId: "u1", emailVerified: true, platformRole: "USER" });
  dependencies.user.mockResolvedValue({ accountStatus: "SUSPENDED" });
  await expect(requireActor(new Headers())).rejects.toMatchObject({
    status: 403,
    code: "ACCOUNT_SUSPENDED",
  });
  expect(await currentActor()).toBeNull();
});
it("rejects missing sessions and deleted users instead of trusting cached identity", async () => {
  dependencies.session.mockResolvedValue(null);
  await expect(requireActor()).rejects.toMatchObject({ status: 401 });
  expect(await currentActor()).toBeNull();
  dependencies.session.mockResolvedValue({ user: { id: "u1" } });
  dependencies.user.mockResolvedValue(null);
  await expect(requireActor()).rejects.toMatchObject({ status: 401 });
});
it("checks legacy installation ownership and propagates infrastructure failures", async () => {
  expect(await requireAdmin()).toEqual({ id: "u1" });
  dependencies.installation.mockResolvedValue({ adminId: "another" });
  await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  dependencies.session.mockRejectedValue(new Error("Database down"));
  await expect(currentActor()).rejects.toThrow("Database down");
});
it("keeps secure cookies, CSRF, live sessions and privileged fields protected", () => {
  getAuth();
  const config = dependencies.config.mock.calls[0][0];
  expect(config.advanced).toMatchObject({
    useSecureCookies: true,
    disableCSRFCheck: false,
    disableOriginCheck: false,
  });
  expect(config.session.cookieCache.enabled).toBe(false);
  expect(config.user.additionalFields.platformRole.input).toBe(false);
  expect(config.user.additionalFields.accountStatus.input).toBe(false);
  expect(config.emailAndPassword.disableSignUp).toBe(true);
});
it("normalizes login email and blocks suspended accounts before authentication", async () => {
  getAuth();
  const hook = dependencies.config.mock.calls[0][0].hooks.before;
  dependencies.user.mockResolvedValue({ accountStatus: "SUSPENDED" });
  await expect(
    hook({ path: "/sign-in/email", body: { email: " Person@Example.Test " } }),
  ).rejects.toThrow();
  expect(dependencies.user).toHaveBeenCalledWith({
    where: { email: "person@example.test" },
    select: { accountStatus: true },
  });
  await expect(hook({ path: "/get-session" })).resolves.toBeUndefined();
});
