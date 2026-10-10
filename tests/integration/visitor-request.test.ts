import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { companyDatabase, seedCompanies } from "../support/company-database";
import { submitFeedback } from "@/server/feedback";
import sharp from "sharp";
import { attachmentBytes, discardAttachment } from "@/server/storage";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let fixture: Awaited<ReturnType<typeof companyDatabase>>;
let storage: string;
vi.mock("@/server/db", () => ({
  get db() {
    return fixture.db;
  },
}));
vi.mock("@/server/rate-limit", () => ({
  rateLimit: async () => {},
  clientKey: () => "request-test",
}));
beforeAll(async () => {
  storage = await mkdtemp(path.join(os.tmpdir(), "heardesk-visitor-test-"));
  vi.stubEnv("STORAGE_DIR", storage);
  fixture = await companyDatabase();
  await seedCompanies(fixture.db);
  await fixture.db.storageBudget.create({ data: { id: 1, used: 0n } });
  await fixture.db.site.create({
    data: { companyId: "x", name: "Shop", origin: "https://shop.test", publicKey: "visitor-key" },
  });
});
afterAll(async () => {
  try {
    await fixture?.close();
  } finally {
    if (storage) {
      await rm(storage, { recursive: true, force: true });
    }
    vi.unstubAllEnvs();
  }
});
function form(id = randomUUID()) {
  const value = new FormData();
  value.set("siteKey", "visitor-key");
  value.set("submissionId", id);
  value.set("type", "ISSUE");
  value.set("message", "Checkout broken");
  value.set("pageUrl", "https://shop.test/checkout?secret=yes#private");
  return value;
}
function request(body: FormData) {
  return new Request("http://localhost/api/feedback", { method: "POST", body });
}

it("persists validated visitor context once and accounts an unchanged retry once", async () => {
  const id = randomUUID();
  const body = form(id);
  expect(await submitFeedback(request(body))).toEqual({ duplicate: false });
  expect(await submitFeedback(request(body))).toEqual({ duplicate: true });
  const reports = await fixture.db.feedback.findMany({ where: { submissionId: id } });
  expect(reports).toHaveLength(1);
  expect(reports[0].pageUrl).toBe("https://shop.test/checkout");
  expect(await fixture.db.reportReservation.count()).toBe(0);
});

it("rejects conflicting retries without replacing committed feedback", async () => {
  const body = form();
  await submitFeedback(request(body));
  body.set("message", "Changed payload");
  await expect(submitFeedback(request(body))).rejects.toMatchObject({
    code: "SUBMISSION_CONFLICT",
  });
});

it("rejects unsupported media, malformed multipart and unrecognized/duplicated fields", async () => {
  await expect(
    submitFeedback(new Request("http://localhost/api/feedback", { method: "POST", body: "{}" })),
  ).rejects.toMatchObject({ status: 415 });
  await expect(
    submitFeedback(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=missing" },
        body: "invalid",
      }),
    ),
  ).rejects.toMatchObject({ status: 400 });
  const duplicate = form();
  duplicate.append("message", "duplicate");
  await expect(submitFeedback(request(duplicate))).rejects.toMatchObject({ status: 400 });
  const extra = form();
  extra.set("companyId", "y");
  await expect(submitFeedback(request(extra))).rejects.toMatchObject({ status: 400 });
});

it("rejects missing widgets, string attachments and oversized files before admission", async () => {
  const missing = form();
  missing.set("siteKey", "missing");
  await expect(submitFeedback(request(missing))).rejects.toMatchObject({ status: 404 });
  const text = form();
  text.set("screenshot", "not-a-file");
  await expect(submitFeedback(request(text))).rejects.toMatchObject({ status: 400 });
  const huge = form();
  huge.set(
    "screenshot",
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
  );
  await expect(submitFeedback(request(huge))).rejects.toMatchObject({ status: 413 });
  expect(await fixture.db.uploadReservation.count()).toBe(0);
});

it("stages a normalized private screenshot, commits accounting and removes bytes on cleanup", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } })
    .png()
    .toBuffer();
  const body = form();
  body.set("screenshot", new File([new Uint8Array(png)], "screenshot.png", { type: "image/png" }));
  expect(await submitFeedback(request(body))).toEqual({ duplicate: false });
  const attachment = await fixture.db.attachment.findFirstOrThrow();
  const bytes = await attachmentBytes(attachment.key);
  expect((await sharp(bytes).metadata()).format).toBe("webp");
  expect(await fixture.db.uploadReservation.count()).toBe(0);
  await discardAttachment(attachment.id, attachment.key);
  await expect(attachmentBytes(attachment.key)).rejects.toMatchObject({ status: 404 });
  await discardAttachment(attachment.id, attachment.key);
});

it("cleans failed image admission and rejects traversal keys", async () => {
  const body = form();
  body.set("screenshot", new File(["not-image"], "image.png", { type: "image/png" }));
  await expect(submitFeedback(request(body))).rejects.toMatchObject({ status: 415 });
  expect(await fixture.db.uploadReservation.count()).toBe(0);
  expect(await fixture.db.reportReservation.count()).toBe(0);
  await expect(attachmentBytes("../secret")).rejects.toMatchObject({ status: 404 });
});
