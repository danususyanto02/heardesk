import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { submitFeedback } from "@/server/feedback";
import { trackedFeedback } from "@/modules/feedback/infrastructure/prisma-feedback-tracking";
import { createCompanyServices } from "@/server/composition/company-services";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  clientKey: () => "tracking-test",
}));
beforeAll(async () => {
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  await fixture.db.site.create({
    data: { companyId: "x", name: "Shop", origin: "https://shop.test", publicKey: "track-site" },
  });
});
afterAll(async () => fixture?.close());
const code = "a".repeat(48);
let feedbackId: string;
const actor = (userId: string) => ({ userId, emailVerified: true, platformRole: "USER" as const });

it("returns identical private access on retry and prevents replacing it using submissionId", async () => {
  const form = new FormData();
  const submissionId = randomUUID();
  for (const [key, value] of Object.entries({
    siteKey: "track-site",
    submissionId,
    trackingCode: code,
    type: "ISSUE",
    message: "Track this problem",
    email: "private@example.test",
  })) {
    form.set(key, value);
  }
  const request = () =>
    new Request("http://localhost/api/feedback", { method: "POST", body: form });
  expect(await submitFeedback(request())).toEqual({ duplicate: false, trackingCode: code });
  expect(await submitFeedback(request())).toEqual({ duplicate: true, trackingCode: code });
  const row = await fixture.db.feedback.findFirstOrThrow({ where: { submissionId } });
  feedbackId = row.id;
  expect(row.trackingHash).not.toBe(code);
  expect(row.trackingHash).toHaveLength(64);
  form.set("trackingCode", "b".repeat(48));
  await expect(submitFeedback(request())).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT" });
  form.delete("trackingCode");
  await expect(submitFeedback(request())).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT" });
});

it("publishes only scoped authorized replies and keeps retry idempotent", async () => {
  const services = createCompanyServices(fixture.db);
  const requestId = randomUUID();
  const reply = await services.addReply(
    actor("agent"),
    "x",
    feedbackId,
    "We are reviewing this.",
    requestId,
  );
  expect(
    await services.addReply(actor("agent"), "x", feedbackId, "We are reviewing this.", requestId),
  ).toEqual(reply);
  await expect(
    services.addReply(actor("agent"), "x", feedbackId, "Changed", requestId),
  ).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT" });
  await expect(
    services.addReply(actor("viewer"), "x", feedbackId, "Forbidden", randomUUID()),
  ).rejects.toMatchObject({ code: "COMPANY_FORBIDDEN" });
  await expect(
    services.addReply(actor("bob"), "y", feedbackId, "Foreign", randomUUID()),
  ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  await expect(
    services.addReply(actor("platform"), "x", feedbackId, "Platform", randomUUID()),
  ).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
  await services.addNote(actor("agent"), "x", feedbackId, "INTERNAL SECRET");
  await services.changeStatus(actor("agent"), "x", feedbackId, "REVIEWING");
  const tracked = await trackedFeedback(fixture.db, code);
  expect(tracked).toMatchObject({
    website: "Shop",
    message: "Track this problem",
    status: "REVIEWING",
    replies: [{ body: "We are reviewing this." }],
  });
  const serialized = JSON.stringify(tracked);
  for (const secret of [
    "private@example.test",
    "INTERNAL SECRET",
    "authorId",
    "trackingHash",
    "companyId",
    "attachment",
    "pageUrl",
  ]) {
    expect(serialized).not.toContain(secret);
  }
  expect(await fixture.db.publicReply.count()).toBe(1);
});

it("does not reveal legacy or suspended reports", async () => {
  expect(await trackedFeedback(fixture.db, "c".repeat(48))).toBeNull();
  await fixture.db.companyProfile.update({
    where: { organizationId: "x" },
    data: { status: "SUSPENDED" },
  });
  expect(await trackedFeedback(fixture.db, code)).toBeNull();
});
