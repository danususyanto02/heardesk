import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sandbox = vi.hoisted(() => ({
  env: "",
  seed: vi.fn(),
  login: vi.fn(),
  fetch: vi.fn(),
  count: vi.fn(),
  companies: vi.fn(),
  overview: vi.fn(),
  audit: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ readFile: async () => sandbox.env }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
vi.mock("../src/generated/prisma/client", () => ({
  PrismaClient: class {
    installation = { findUniqueOrThrow: async () => ({ adminId: "platform" }) };
    user = {
      findUniqueOrThrow: async () => ({
        id: "platform",
        emailVerified: true,
        platformRole: "PLATFORM_OWNER",
      }),
    };
    feedback = { count: sandbox.count };
    internalNote = { count: async () => 12 };
    $disconnect = sandbox.disconnect;
  },
}));
vi.mock("../scripts/demo-data", () => ({ seedDemoData: sandbox.seed }));
vi.mock("../scripts/demo-login", () => ({ enableDemoLogin: sandbox.login }));
vi.mock("../src/server/composition/platform-services", () => ({
  createPlatformServices: () => ({
    companies: sandbox.companies,
    overview: sandbox.overview,
    audit: sandbox.audit,
  }),
}));
beforeEach(() => {
  sandbox.env =
    'DATABASE_URL="postgresql://runtime@localhost/ureport"\nAPP_URL="http://localhost:3000"';
  sandbox.seed.mockResolvedValue({ companies: 4, reports: 48 });
  sandbox.login.mockResolvedValue({ created: false, email: "demo@example.test" });
  sandbox.count.mockResolvedValue(48);
  sandbox.companies.mockResolvedValue({ total: 4, items: [] });
  sandbox.overview.mockResolvedValue({ companies: 4 });
  sandbox.audit.mockResolvedValue({ total: 8 });
  sandbox.fetch.mockReset();
  vi.stubGlobal("fetch", sandbox.fetch);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubEnv("HEARDESK_DEMO_PASSWORD", "");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function run(flag = "") {
  const original = process.argv;
  process.argv = ["node", "seed-demo.ts", flag];
  vi.resetModules();
  try {
    await import("../scripts/seed-demo");
  } finally {
    process.argv = original;
  }
}
it("seeds only the explicit application target", async () => {
  await run();
  expect(sandbox.seed).toHaveBeenCalledWith(expect.anything(), "platform", expect.any(Date));
  sandbox.env = 'DATABASE_URL="postgresql://runtime@localhost/another"';
  await expect(run()).rejects.toThrow("intended ureport application database");
});
it("rejects connection target overrides", async () => {
  sandbox.env = 'DATABASE_URL="postgresql://runtime@localhost/ureport?options=unsafe"';
  await expect(run()).rejects.toThrow("intended ureport application database");
});
it("verifies expected demo counts and rejects partial datasets", async () => {
  await run("--verify");
  sandbox.count.mockResolvedValue(47);
  await expect(run("--verify")).rejects.toThrow("Demo data verification failed");
});
it("requires local hostname and explicit password for demo login", async () => {
  sandbox.env =
    'DATABASE_URL="postgresql://runtime@localhost/ureport"\nAPP_URL="https://remote.test"';
  await expect(run("--enable-login")).rejects.toThrow("local development only");
  sandbox.env =
    'DATABASE_URL="postgresql://runtime@localhost/ureport"\nAPP_URL="http://localhost:3000"';
  await expect(run("--enable-login")).rejects.toThrow("HEARDESK_DEMO_PASSWORD is required");
});
it("does not repeat HTTP login verification for existing credentials", async () => {
  vi.stubEnv("HEARDESK_DEMO_PASSWORD", "synthetic-password-example");
  await run("--enable-login");
  expect(sandbox.fetch).not.toHaveBeenCalled();
});
it("verifies new demo identity has one Company and no platform access", async () => {
  vi.stubEnv("HEARDESK_DEMO_PASSWORD", "synthetic-password-example");
  sandbox.login.mockResolvedValue({ created: true, email: "demo@example.test" });
  sandbox.fetch.mockImplementation(async (url: string) => {
    if (url.endsWith("/sign-in/email")) {
      return Response.json({}, { headers: { "set-cookie": "session=synthetic; HttpOnly" } });
    }
    if (url.endsWith("/api/companies")) {
      return Response.json([{ id: "heardesk-demo-northstar", role: "ADMIN" }]);
    }
    if (url.endsWith("/api/platform/overview")) {
      return Response.json({}, { status: 403 });
    }
    return Response.json({ success: true });
  });
  await run("--enable-login");
  expect(sandbox.fetch).toHaveBeenCalledTimes(4);
});
it("rejects unexpected demo Company ownership and failed HTTP login", async () => {
  vi.stubEnv("HEARDESK_DEMO_PASSWORD", "synthetic-password-example");
  sandbox.login.mockResolvedValue({ created: true, email: "demo@example.test" });
  sandbox.fetch.mockResolvedValue(Response.json({}, { status: 401 }));
  await expect(run("--enable-login")).rejects.toThrow("HTTP verification failed");
  sandbox.fetch.mockImplementation(async (url: string) =>
    url.endsWith("/api/companies")
      ? Response.json([{ id: "foreign", role: "OWNER" }])
      : Response.json({}),
  );
  await expect(run("--enable-login")).rejects.toThrow("Unexpected demo Company access");
});
