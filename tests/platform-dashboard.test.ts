import { expect, it } from "vitest";
import { platformDashboard } from "@/modules/platform/application/platform-dashboard";
import type {
  PlatformRepository,
  LimitsChange,
  StatusChange,
} from "@/modules/platform/domain/platform-repository";
import type { SessionReader } from "@/modules/identity/domain/session";

const session: SessionReader = {
  current: async () => ({
    userId: "platform",
    emailVerified: true,
    platformRole: "PLATFORM_OWNER",
  }),
};
const change: StatusChange = {
  status: "SUSPENDED",
  reason: "  Investigating abuse  ",
  expectedUpdatedAt: "2026-10-10T00:00:00Z",
};
const limits: LimitsChange = {
  websites: 3,
  seats: 5,
  monthlyReports: 1000,
  storageBytes: "001024",
  reason: "  Customer request  ",
  expectedUpdatedAt: change.expectedUpdatedAt,
};

function repository() {
  const state: { action?: string; actor?: string; id?: string; input?: unknown } = {};
  const record = async (action: string, actor: string, id: string, input: unknown) => {
    Object.assign(state, { action, actor, id, input });
    return {};
  };
  const port = {
    companies: (actor: string, input: unknown) => record("companies", actor, "", input),
    users: (actor: string, input: unknown) => record("users", actor, "", input),
    audit: (actor: string, input: unknown) => record("audit", actor, "", input),
    setStatus: (actor: string, id: string, input: unknown) => record("status", actor, id, input),
    setLimits: (actor: string, id: string, input: unknown) => record("limits", actor, id, input),
  } as unknown as PlatformRepository;
  return { port, state };
}

it.each(["companies", "users", "audit"] as const)(
  "normalizes %s search and default page size",
  async (action) => {
    const { port, state } = repository();
    await platformDashboard(port, session)[action]({ q: "  Demo  ", page: 1 });
    expect(state).toMatchObject({
      action,
      actor: "platform",
      input: { q: "Demo", page: 1, pageSize: 25 },
    });
  },
);

it.each([
  { q: "x".repeat(201), page: 1 },
  { q: "", page: 0 },
  { q: "", page: 100001 },
  { q: "", page: 1.5 },
  { q: "", page: 1, pageSize: 7 },
])("rejects invalid queries before accessing repository", async (query) => {
  const { port, state } = repository();
  await expect(platformDashboard(port, session).companies(query)).rejects.toThrow();
  expect(state.action).toBeUndefined();
});

it("trims audited status reasons and preserves optimistic version", async () => {
  const { port, state } = repository();
  await platformDashboard(port, session).setStatus("company-x", change);
  expect(state).toMatchObject({
    actor: "platform",
    id: "company-x",
    input: { ...change, reason: "Investigating abuse" },
  });
});

it.each([
  { ...change, reason: " " },
  { ...change, reason: "x".repeat(501) },
  { ...change, expectedUpdatedAt: "invalid" },
  { ...change, status: "UNKNOWN" as StatusChange["status"] },
])("rejects invalid status action", async (input) => {
  const { port, state } = repository();
  await expect(
    platformDashboard(port, session).setStatus("company-x", input),
  ).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
  expect(state.action).toBeUndefined();
});

it("normalizes storage limits without losing bigint precision", async () => {
  const { port, state } = repository();
  await platformDashboard(port, session).setLimits("company-x", limits);
  expect(state.input).toEqual({ ...limits, reason: "Customer request", storageBytes: "1024" });
});

it.each([
  { ...limits, websites: -1 },
  { ...limits, seats: 0.5 },
  { ...limits, monthlyReports: 2147483648 },
  { ...limits, storageBytes: "-1" },
  { ...limits, storageBytes: "9223372036854775808" },
  { ...limits, storageBytes: "1".repeat(20) },
])("rejects overflowing or invalid limits without changing Company", async (input) => {
  const { port, state } = repository();
  await expect(
    platformDashboard(port, session).setLimits("company-x", input),
  ).rejects.toMatchObject({ code: "PLATFORM_INPUT_INVALID" });
  expect(state.action).toBeUndefined();
});

it("denies Company users before performing platform actions", async () => {
  const { port, state } = repository();
  const client: SessionReader = {
    current: async () => ({ userId: "admin", emailVerified: true, platformRole: "USER" }),
  };
  await expect(
    platformDashboard(port, client).setLimits("company-x", limits),
  ).rejects.toMatchObject({ code: "PLATFORM_FORBIDDEN" });
  expect(state.action).toBeUndefined();
});
