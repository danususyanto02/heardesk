import { afterAll, beforeAll, expect, it } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { createCompanyServices } from "@/server/composition/company-services";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
let xSite: number, ySite: number;
const alice = { userId: "alice", emailVerified: true, platformRole: "USER" as const };
beforeAll(async () => {
  fixture = await companyDatabase(); await seedCompanies(fixture.db);
  for (const companyId of ["x", "y"]) {
    const site = await fixture.db.site.create({ data: { name: companyId, companyId, origin: `https://${companyId}.test`, publicKey: `${companyId}-key` } });
    if (companyId === "x") xSite = site.id; else ySite = site.id;
    await fixture.db.feedback.create({ data: { id: `${companyId}-report`, siteId: site.id, submissionId: "same-submission", fingerprint: "private", type: "ISSUE", message: `${companyId} private report`, attachment: { create: { id: `${companyId}-attachment`, key: `${companyId}-private.webp`, filename: "screenshot.webp", mime: "image/webp", size: 10 } } } });
  }
});
afterAll(async () => { await fixture?.close(); });
it("scopes lists, details, notes, mutations and attachments even with foreign IDs", async () => {
  const service = createCompanyServices(fixture.db);
  const page = await service.listFeedback(alice, "x", { q: "", page: 1 });
  expect(page.total).toBe(1); expect(page.items[0].id).toBe("x-report");
  expect(await service.getFeedback(alice, "x", "x-report")).not.toHaveProperty("fingerprint");
  for (const action of [
    () => service.getFeedback(alice, "x", "y-report"),
    () => service.changeStatus(alice, "x", "y-report", "DONE"),
    () => service.addNote(alice, "x", "y-report", "foreign note"),
    () => service.attachment(alice, "x", "y-attachment"),
    () => service.listFeedback(alice, "x", { q: "", page: 1, siteId: ySite }),
  ]) await expect(action()).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  expect((await fixture.db.feedback.findUniqueOrThrow({ where: { id: "y-report" } })).status).toBe("NEW");
  expect(await fixture.db.internalNote.count()).toBe(0);
});
it("Viewer cannot write and notes attribute server actor", async () => {
  const service = createCompanyServices(fixture.db);
  await expect(service.changeStatus({ ...alice, userId: "viewer" }, "x", "x-report", "DONE")).rejects.toMatchObject({ code: "COMPANY_FORBIDDEN" });
  const note = await service.addNote({ ...alice, userId: "admin" }, "x", "x-report", "internal note");
  expect(note.author.id).toBe("admin");
  await expect(service.changeStatus(alice, "x", "x-report", "DONE")).resolves.toEqual({ id: "x-report", status: "DONE" });
});
it("website lookup and rotation cannot target foreign website", async () => {
  const service = createCompanyServices(fixture.db);
  await expect(service.getWebsite(alice, "x", ySite)).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  await expect(service.rotateKey(alice, "x", ySite, "y-key", "replacement")).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  await expect(service.rotateKey(alice, "x", xSite, "stale", "replacement")).rejects.toMatchObject({ code: "STALE_KEY" });
  const rotated = await service.rotateKey(alice, "x", xSite, "x-key", "replacement");
  expect(rotated.publicKey).toBe("replacement");
  expect(await fixture.db.feedback.count()).toBe(2);
  expect(await fixture.db.auditEvent.count({ where: { action: "WEBSITE_KEY_ROTATED", companyId: "x" } })).toBe(1);
});
