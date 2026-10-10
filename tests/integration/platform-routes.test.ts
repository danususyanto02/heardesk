import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import * as views from "@/app/api/platform/[view]/route";
import * as companies from "@/app/api/platform/companies/[companyId]/route";
import * as users from "@/app/api/platform/users/[userId]/route";
import * as activity from "@/app/api/platform/activity/route";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const identity = vi.hoisted(() => ({ userId: "platform", platformRole: "PLATFORM_OWNER" }));
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock("@/server/auth", () => ({
  requireActor: async () => ({ ...identity, emailVerified: true }),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  clientKey: () => "platform-route-test",
}));
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
});
afterAll(async () => {
  await fixture?.close();
});
function request(path: string, method = "GET", body?: unknown) {
  return new Request("http://localhost:3100" + path, {
    method,
    headers: { Origin: "http://localhost:3100" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
it.each(["overview", "companies", "usage", "users", "audit"])(
  "returns metadata for %s",
  async (view) => {
    const response = await views.GET(request("/api/platform/" + view), {
      params: Promise.resolve({ view }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  },
);
it("rejects invalid views/query and non-platform identities", async () => {
  expect(
    (
      await views.GET(request("/api/platform/unknown"), {
        params: Promise.resolve({ view: "unknown" }),
      })
    ).status,
  ).toBe(404);
  expect(
    (
      await views.GET(request("/api/platform/users?pageSize=7"), {
        params: Promise.resolve({ view: "users" }),
      })
    ).status,
  ).toBe(400);
  identity.userId = "alice";
  identity.platformRole = "USER";
  expect(
    (
      await views.GET(request("/api/platform/overview"), {
        params: Promise.resolve({ view: "overview" }),
      })
    ).status,
  ).toBe(403);
  identity.userId = "platform";
  identity.platformRole = "PLATFORM_OWNER";
});
it("applies audited status and limit changes with optimistic concurrency", async () => {
  const context = { params: Promise.resolve({ companyId: "x" }) };
  const current = await (await companies.GET(request("/api/platform/companies/x"), context)).json();
  const changed = await companies.PATCH(
    request("/api/platform/companies/x", "PATCH", {
      action: "status",
      status: "SUSPENDED",
      reason: "Route test",
      expectedUpdatedAt: current.updatedAt,
    }),
    context,
  );
  expect(changed.status).toBe(200);
  const updated = await changed.json();
  const limits = await companies.PATCH(
    request("/api/platform/companies/x", "PATCH", {
      action: "limits",
      websites: 10,
      seats: 20,
      monthlyReports: 100,
      storageBytes: "100000000",
      reason: "Allowance request",
      expectedUpdatedAt: updated.updatedAt,
    }),
    context,
  );
  expect(limits.status).toBe(200);
  expect((await limits.json()).limits.seats).toBe(20);
  expect(
    (
      await companies.PATCH(
        request("/api/platform/companies/x", "PATCH", {
          action: "status",
          status: "ACTIVE",
          reason: " ",
          expectedUpdatedAt: updated.updatedAt,
        }),
        context,
      )
    ).status,
  ).toBe(400);
  expect(await fixture.db.auditEvent.count({ where: { companyId: "x" } })).toBe(2);
});
it("returns user metadata and performs reason-required account operations", async () => {
  const context = { params: Promise.resolve({ userId: "alice" }) };
  expect((await users.GET(request("/api/platform/users/alice"), context)).status).toBe(200);
  for (const action of ["SUSPEND", "REACTIVATE", "REVOKE_SESSIONS"]) {
    expect(
      (
        await users.PATCH(
          request("/api/platform/users/alice", "PATCH", { action, reason: "Owner request" }),
          context,
        )
      ).status,
    ).toBe(200);
  }
  expect(
    (
      await users.PATCH(
        request("/api/platform/users/alice", "PATCH", { action: "SUSPEND", reason: "" }),
        context,
      )
    ).status,
  ).toBe(400);
  const owner = { params: Promise.resolve({ userId: "platform" }) };
  expect(
    (
      await users.PATCH(
        request("/api/platform/users/platform", "PATCH", {
          action: "SUSPEND",
          reason: "Disallowed",
        }),
        owner,
      )
    ).status,
  ).toBe(403);
});

it("returns daily, monthly and annual UTC activity while rejecting invalid ranges", async () => {
  const annual = await activity.GET(request("/api/platform/activity?period=annual&year=2026"));
  expect(annual.status).toBe(200);
  expect((await annual.json()).points).toHaveLength(12);
  const monthly = await activity.GET(
    request("/api/platform/activity?period=monthly&year=2026&month=2"),
  );
  expect(monthly.status).toBe(200);
  expect((await monthly.json()).points).toHaveLength(28);
  const recent = await activity.GET(request("/api/platform/activity?days=7"));
  expect(recent.status).toBe(200);
  expect((await recent.json()).points).toHaveLength(7);
  expect((await activity.GET(request("/api/platform/activity?days=8"))).status).toBe(400);
  expect((await activity.GET(request("/api/platform/activity?month=13"))).status).toBe(400);
});
