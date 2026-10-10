import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import * as websites from "@/app/api/companies/[companyId]/sites/route";
import * as website from "@/app/api/companies/[companyId]/sites/[siteId]/route";
import * as feedback from "@/app/api/companies/[companyId]/feedback/[feedbackId]/route";
import * as statistics from "@/app/api/companies/[companyId]/feedback/statistics/route";
import * as notes from "@/app/api/companies/[companyId]/feedback/[feedbackId]/notes/route";
import * as exports from "@/app/api/companies/[companyId]/feedback/export/route";
import * as keys from "@/app/api/companies/[companyId]/sites/[siteId]/key/route";
import * as onboarding from "@/app/api/companies/route";
import * as active from "@/app/api/companies/active/route";
import { Workbook } from "exceljs";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
let siteId: number;
const identity = vi.hoisted(() => ({ userId: "alice" }));
const preference = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => preference }));
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock("@/server/auth", () => ({
  requireActor: async () => ({
    userId: identity.userId,
    emailVerified: true,
    platformRole: "USER",
  }),
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  clientKey: () => "route-test",
}));
const origin = "http://localhost:3100";
function request(path: string, method = "GET", body?: unknown) {
  return new Request(origin + path, {
    method,
    headers: { Origin: origin },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
beforeAll(async () => {
  vi.stubEnv("HEARDESK_DEFAULT_WEBSITES", "3");
  vi.stubEnv("HEARDESK_DEFAULT_SEATS", "5");
  vi.stubEnv("HEARDESK_DEFAULT_MONTHLY_REPORTS", "1000");
  vi.stubEnv("HEARDESK_DEFAULT_STORAGE_BYTES", "1073741824");
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  const site = await fixture.db.site.create({
    data: { companyId: "x", name: "Shop", origin: "https://shop.test", publicKey: "route-key" },
  });
  siteId = site.id;
  await fixture.db.feedback.create({
    data: {
      id: "route-report",
      siteId,
      submissionId: "route-submission",
      fingerprint: "route-fingerprint",
      type: "ISSUE",
      status: "NEW",
      message: "Checkout broken",
      createdAt: new Date("2026-10-10T00:00:00Z"),
    },
  });
});
afterAll(async () => {
  await fixture?.close();
  vi.unstubAllEnvs();
});

it("returns Company website pages and rejects unsupported page sizes", async () => {
  identity.userId = "alice";
  const context = { params: Promise.resolve({ companyId: "x" }) };
  const response = await websites.GET(request("/api/companies/x/sites?pageSize=10"), context);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    total: 1,
    page: 1,
    pageSize: 10,
    items: [{ companyId: "x", id: siteId }],
  });
  expect((await websites.GET(request("/api/companies/x/sites?pageSize=7"), context)).status).toBe(
    400,
  );
});

it("creates a scoped website and rejects an untrusted write origin", async () => {
  const input = {
    name: "Portal",
    origin: "https://portal.test",
    buttonLabel: "Report",
    position: "right",
  };
  const context = { params: Promise.resolve({ companyId: "x" }) };
  const response = await websites.POST(request("/api/companies/x/sites", "POST", input), context);
  expect(response.status).toBe(201);
  expect((await response.json()).companyId).toBe("x");
  const foreign = new Request(origin + "/api/companies/x/sites", {
    method: "POST",
    headers: { Origin: "https://evil.test" },
    body: JSON.stringify(input),
  });
  expect((await websites.POST(foreign, context)).status).toBe(403);
});

it("reads and updates websites through validated IDs and live membership", async () => {
  const context = { params: Promise.resolve({ companyId: "x", siteId: String(siteId) }) };
  expect((await website.GET(request("/api/companies/x/sites/1"), context)).status).toBe(200);
  const updated = await website.PATCH(
    request("/api/companies/x/sites/1", "PATCH", {
      name: "Updated shop",
      origin: "https://shop.test",
      buttonLabel: "Feedback",
      position: "left",
    }),
    context,
  );
  expect(updated.status).toBe(200);
  expect((await updated.json()).position).toBe("left");
  expect(
    (
      await website.GET(request("/api/companies/x/sites/invalid"), {
        params: Promise.resolve({ companyId: "x", siteId: "invalid" }),
      })
    ).status,
  ).toBe(400);
  identity.userId = "bob";
  expect((await website.GET(request("/api/companies/x/sites/1"), context)).status).toBe(404);
  identity.userId = "alice";
});

it("reads and changes feedback without exposing foreign Company reports", async () => {
  const context = { params: Promise.resolve({ companyId: "x", feedbackId: "route-report" }) };
  expect(
    (await feedback.GET(request("/api/companies/x/feedback/route-report"), context)).status,
  ).toBe(200);
  const changed = await feedback.PATCH(
    request("/api/companies/x/feedback/route-report", "PATCH", { status: "ARCHIVED" }),
    context,
  );
  expect(changed.status).toBe(200);
  expect(
    (await fixture.db.feedback.findUniqueOrThrow({ where: { id: "route-report" } })).status,
  ).toBe("ARCHIVED");
  expect(
    (
      await feedback.PATCH(
        request("/api/companies/x/feedback/route-report", "PATCH", { status: "invalid" }),
        context,
      )
    ).status,
  ).toBe(400);
  identity.userId = "bob";
  expect(
    (await feedback.GET(request("/api/companies/x/feedback/route-report"), context)).status,
  ).toBe(404);
  identity.userId = "alice";
});

it("returns zero-filled statistics and rejects invalid periods", async () => {
  const context = { params: Promise.resolve({ companyId: "x" }) };
  const response = await statistics.GET(
    request("/api/companies/x/feedback/statistics?period=annual&year=2026"),
    context,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).rows).toHaveLength(12);
  expect(
    (await statistics.GET(request("/api/companies/x/feedback/statistics?period=invalid"), context))
      .status,
  ).toBe(400);
});

it("writes internal notes and rejects empty or foreign writes", async () => {
  const context = { params: Promise.resolve({ companyId: "x", feedbackId: "route-report" }) };
  const response = await notes.POST(
    request("/api/companies/x/feedback/route-report/notes", "POST", { body: "Investigating" }),
    context,
  );
  expect(response.status).toBe(201);
  expect((await response.json()).body).toBe("Investigating");
  expect(
    (
      await notes.POST(
        request("/api/companies/x/feedback/route-report/notes", "POST", { body: " " }),
        context,
      )
    ).status,
  ).toBe(400);
  identity.userId = "bob";
  expect(
    (
      await notes.POST(
        request("/api/companies/x/feedback/route-report/notes", "POST", { body: "Foreign" }),
        context,
      )
    ).status,
  ).toBe(404);
  identity.userId = "alice";
});

it("exports real aggregate workbook, rejects empty periods and respects membership", async () => {
  const context = { params: Promise.resolve({ companyId: "x" }) };
  const response = await exports.GET(
    request("/api/companies/x/feedback/export?period=annual&year=2026"),
    context,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("spreadsheetml");
  const book = new Workbook();
  await book.xlsx.load(
    Buffer.from(await response.arrayBuffer()) as unknown as Parameters<typeof book.xlsx.load>[0],
  );
  expect(book.worksheets.length).toBeGreaterThan(0);
  const sheet = book.worksheets[0];
  expect(sheet.getRow(sheet.rowCount).getCell(5).value).toBe(1);
  expect(sheet.getRow(sheet.rowCount).getCell(2).value).toBe(1);
  const empty = await exports.GET(
    request("/api/companies/x/feedback/export?period=annual&year=1900"),
    context,
  );
  expect(empty.status).toBe(422);
  expect((await empty.json()).error.code).toBe("EXPORT_EMPTY");
  identity.userId = "bob";
  expect(
    (
      await exports.GET(
        request("/api/companies/x/feedback/export?period=annual&year=2026"),
        context,
      )
    ).status,
  ).toBe(404);
  identity.userId = "alice";
});

it("rotates keys with expected-key concurrency control and explicit confirmation", async () => {
  const context = { params: Promise.resolve({ companyId: "x", siteId: String(siteId) }) };
  const response = await keys.POST(
    request("/api/companies/x/sites/1/key", "POST", { confirm: true, expectedKey: "route-key" }),
    context,
  );
  expect(response.status).toBe(200);
  expect((await response.json()).publicKey).not.toBe("route-key");
  expect(
    (
      await keys.POST(
        request("/api/companies/x/sites/1/key", "POST", {
          confirm: true,
          expectedKey: "route-key",
        }),
        context,
      )
    ).status,
  ).toBe(409);
  expect(
    (
      await keys.POST(
        request("/api/companies/x/sites/1/key", "POST", {
          confirm: false,
          expectedKey: "route-key",
        }),
        context,
      )
    ).status,
  ).toBe(400);
});

it("creates Company idempotently and lists only live memberships", async () => {
  const body = { name: "New Company", idempotencyKey: "route-company-create" };
  const first = await onboarding.POST(request("/api/companies", "POST", body));
  const second = await onboarding.POST(request("/api/companies", "POST", body));
  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  const created = await first.json();
  expect((await second.json()).id).toBe(created.id);
  const list = await onboarding.GET(request("/api/companies"));
  expect(list.status).toBe(200);
  expect((await list.json()).map((company: { id: string }) => company.id)).toContain(created.id);
  expect(
    (await onboarding.POST(request("/api/companies", "POST", { ...body, name: "" }))).status,
  ).toBe(400);
});

it("writes Company preference only after validating live membership", async () => {
  expect(
    (await active.POST(request("/api/companies/active", "POST", { companyId: "x" }))).status,
  ).toBe(200);
  expect(preference.set).toHaveBeenCalledWith(
    "heardesk-company",
    "x",
    expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
  );
  preference.set.mockClear();
  identity.userId = "bob";
  expect(
    (await active.POST(request("/api/companies/active", "POST", { companyId: "x" }))).status,
  ).toBe(404);
  expect(preference.set).not.toHaveBeenCalled();
  identity.userId = "alice";
});
