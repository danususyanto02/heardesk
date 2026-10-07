import { expect, it } from "vitest";
import { submitVisitorFeedback, type VisitorFeedbackPorts } from "@/modules/feedback/application/submit-visitor-feedback";

const input = { siteKey: "key", submissionId: "retry", fingerprint: "hash", type: "ISSUE" as const, message: "broken button" };
it("committed duplicate returns before image staging and accounting", async () => {
  const ports: VisitorFeedbackPorts = {
    resolve: async () => ({ companyId: "x", siteId: 1 }),
    reserve: async () => ({ duplicate: true }),
    stage: async () => { throw new Error("Must not stage a duplicate"); },
    persist: async () => { throw new Error("Must not persist a duplicate"); },
    discard: async () => { throw new Error("Must not discard a duplicate"); },
    release: async () => { throw new Error("Must not charge a duplicate"); },
  };
  expect(await submitVisitorFeedback(input, new Uint8Array([1]), ports)).toEqual({ duplicate: true });
});
it("image failure releases report reservation without pretending report persisted", async () => {
  const released: string[] = [];
  const ports: VisitorFeedbackPorts = {
    resolve: async () => ({ companyId: "x", siteId: 1 }),
    reserve: async () => ({ id: "held", companyId: "x", siteId: 1, submissionId: "retry", period: "2026-10", expiresAt: "2026-10-06T00:00:00Z" }),
    stage: async () => { throw new Error("Image invalid"); },
    persist: async () => { throw new Error("Must not persist invalid image"); },
    discard: async () => {}, release: async (_company, reservation) => { released.push(reservation.id); },
  };
  await expect(submitVisitorFeedback(input, new Uint8Array([1]), ports)).rejects.toThrow("Image invalid");
  expect(released).toEqual(["held"]);
});
