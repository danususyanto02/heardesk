import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/auth/[...all]/route";
const dependencies = vi.hoisted(() => ({
  session: vi.fn(),
  user: vi.fn(),
  installation: vi.fn(),
  deleted: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock("@/server/auth", () => ({
  getAuth: () => ({ api: { getSession: dependencies.session } }),
}));
vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: dependencies.user },
    installation: { findUnique: dependencies.installation },
  },
}));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: dependencies.get, POST: dependencies.post }),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  clientKey: () => "route-test",
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: dependencies.deleted }) }));
beforeEach(() => {
  dependencies.session.mockResolvedValue(null);
  dependencies.user.mockResolvedValue({ accountStatus: "ACTIVE" });
  dependencies.installation.mockResolvedValue({ id: 1 });
  dependencies.get.mockResolvedValue(Response.json({ ok: true }));
  dependencies.post.mockResolvedValue(Response.json({ ok: true }));
  dependencies.deleted.mockClear();
  vi.stubEnv("APP_URL", "http://localhost:3100");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/ureport_test");
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("UREPORT_SETUP_TOKEN", "y".repeat(32));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function request(path: string, method = "GET", cookie = false) {
  return new Request("http://localhost:3100/api/auth/" + path, {
    method,
    headers: {
      Origin: "http://localhost:3100",
      ...(cookie ? { Cookie: "session=synthetic" } : {}),
    },
    ...(method === "POST" ? { body: "{}" } : {}),
  });
}
it("allows anonymous and active session requests but refuses suspended sessions", async () => {
  expect((await GET(request("get-session"))).status).toBe(200);
  dependencies.session.mockResolvedValue({ user: { id: "u1" } });
  expect((await GET(request("get-session", "GET", true))).status).toBe(200);
  dependencies.user.mockResolvedValue({ accountStatus: "SUSPENDED" });
  expect((await GET(request("get-session", "GET", true))).status).toBe(403);
});
it("blocks organization endpoints before invoking framework handlers", async () => {
  expect((await GET(request("organization/list", "GET", true))).status).toBe(403);
  expect((await POST(request("organization/create", "POST"))).status).toBe(403);
  expect(dependencies.get).not.toHaveBeenCalled();
  expect(dependencies.post).not.toHaveBeenCalled();
});
it("allows suspended users to sign out and clears Company preference only on success", async () => {
  dependencies.session.mockResolvedValue({ user: { id: "u1" } });
  dependencies.user.mockResolvedValue({ accountStatus: "SUSPENDED" });
  expect((await POST(request("sign-out", "POST", true))).status).toBe(200);
  expect(dependencies.deleted).toHaveBeenCalledWith("heardesk-company");
  dependencies.deleted.mockClear();
  dependencies.post.mockResolvedValue(Response.json({}, { status: 400 }));
  expect((await POST(request("sign-out", "POST", true))).status).toBe(400);
  expect(dependencies.deleted).not.toHaveBeenCalled();
});
it("gates signup to installed local environment and rejects oversized requests", async () => {
  vi.stubEnv("HEARDESK_LOCAL_SIGNUP", "false");
  expect((await POST(request("sign-up/email", "POST"))).status).toBe(403);
  vi.stubEnv("HEARDESK_LOCAL_SIGNUP", "true");
  vi.stubEnv("HEARDESK_EMAIL_MODE", "local");
  expect((await POST(request("sign-up/email", "POST"))).status).toBe(200);
  dependencies.installation.mockResolvedValue(null);
  expect((await POST(request("sign-up/email", "POST"))).status).toBe(403);
  const huge = new Request("http://localhost:3100/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: "http://localhost:3100" },
    body: "x".repeat(32769),
  });
  expect((await POST(huge)).status).toBe(413);
});
