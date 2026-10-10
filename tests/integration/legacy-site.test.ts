import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { connectSite, defaultSite, rotateWidgetKey, updateSite } from "@/server/site";
import * as siteRoutes from "@/app/api/admin/site/route";
import * as listRoutes from "@/app/api/admin/feedback/route";
import * as detailRoutes from "@/app/api/admin/feedback/[id]/route";
let fixture: Awaited<ReturnType<typeof companyDatabase>>;
const identity = vi.hoisted(() => ({ userId: "alice", verified: true }));
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock("@/server/auth", () => ({
  requireActor: async () => ({
    userId: identity.userId,
    emailVerified: identity.verified,
    platformRole: "USER",
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
beforeAll(async () => {
  vi.stubEnv("HEARDESK_DEFAULT_WEBSITES", "3");
  vi.stubEnv("HEARDESK_DEFAULT_SEATS", "5");
  vi.stubEnv("HEARDESK_DEFAULT_MONTHLY_REPORTS", "1000");
  vi.stubEnv("HEARDESK_DEFAULT_STORAGE_BYTES", "1073741824");
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
});
afterAll(async () => {
  await fixture?.close();
  vi.unstubAllEnvs();
});
const headers = new Headers({ "x-heardesk-company": "x" });
it("connects only the selected Company and reads its default website", async () => {
  const site = await connectSite({ address: "https://shop.test/path?private=1" }, headers);
  expect(site.companyId).toBe("x");
  expect(site.origin).toBe("https://shop.test");
  expect((await defaultSite(headers))?.id).toBe(site.id);
  await updateSite(
    { name: "Shop updated", origin: site.origin, buttonLabel: "Report", position: "left" },
    headers,
  );
  expect((await defaultSite(headers))?.name).toBe("Shop updated");
  const rotated = await rotateWidgetKey({ confirm: true, expectedKey: site.publicKey }, headers);
  expect(rotated.publicKey).not.toBe(site.publicKey);
});
it("rejects selected foreign Company and unverified identities", async () => {
  await expect(
    connectSite({ address: "https://other.test" }, new Headers({ "x-heardesk-company": "y" })),
  ).rejects.toMatchObject({ status: 404 });
  identity.verified = false;
  await expect(connectSite({ address: "https://other.test" }, headers)).rejects.toMatchObject({
    status: 403,
  });
  identity.verified = true;
});
it("returns no site for empty membership and rejects editing an unconnected Company", async () => {
  identity.userId = "bob";
  const selected = new Headers({ "x-heardesk-company": "y" });
  expect(await defaultSite(selected)).toBeNull();
  await expect(updateSite({}, selected)).rejects.toMatchObject({ status: 409 });
  await expect(
    rotateWidgetKey({ confirm: true, expectedKey: "key" }, selected),
  ).rejects.toMatchObject({ status: 409 });
  identity.userId = "platform";
  expect(await defaultSite()).toBeNull();
  await expect(connectSite({ address: "https://platform.test" })).rejects.toMatchObject({
    status: 403,
  });
  identity.userId = "alice";
});

it("legacy site HTTP adapter returns configuration and validates scoped writes", async () => {
  const request = (method = "GET", body?: unknown) =>
    new Request("http://localhost:3100/api/admin/site", {
      method,
      headers: { Origin: "http://localhost:3100", "x-heardesk-company": "x" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const configuration = await siteRoutes.GET(request());
  expect(configuration.status).toBe(200);
  expect((await configuration.json()).configured).toBe(true);
  const connected = await siteRoutes.POST(request("POST", { address: "https://second.test/path" }));
  expect(connected.status).toBe(201);
  expect((await connected.json()).origin).toBe("https://second.test");
  expect(
    (
      await siteRoutes.PATCH(
        request("PATCH", {
          name: "Updated",
          origin: "https://shop.test",
          buttonLabel: "Feedback",
          position: "right",
        }),
      )
    ).status,
  ).toBe(200);
  expect((await siteRoutes.PATCH(request("PATCH", { name: "" }))).status).toBe(400);
});

it("legacy inbox HTTP adapters retain Company isolation and status validation", async () => {
  const site = await defaultSite(headers);
  await fixture.db.feedback.create({
    data: {
      id: "legacy-report",
      siteId: site!.id,
      submissionId: "legacy-submission",
      fingerprint: "legacy-fingerprint",
      type: "ISSUE",
      message: "Legacy message",
    },
  });
  const request = (method = "GET", body?: unknown) =>
    new Request("http://localhost:3100/api/admin/feedback", {
      method,
      headers: { Origin: "http://localhost:3100", "x-heardesk-company": "x" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const list = await listRoutes.GET(request());
  expect(list.status).toBe(200);
  expect((await list.json()).items).toHaveLength(1);
  const context = { params: Promise.resolve({ id: "legacy-report" }) };
  expect((await detailRoutes.GET(request(), context)).status).toBe(200);
  expect((await detailRoutes.PATCH(request("PATCH", { status: "DONE" }), context)).status).toBe(
    200,
  );
  expect((await detailRoutes.PATCH(request("PATCH", { status: "invalid" }), context)).status).toBe(
    400,
  );
  identity.userId = "bob";
  expect((await detailRoutes.GET(request(), context)).status).toBe(403);
  identity.userId = "platform";
  const empty = await listRoutes.GET(request());
  expect(empty.status).toBe(200);
  expect((await empty.json()).items).toEqual([]);
  identity.userId = "alice";
});
