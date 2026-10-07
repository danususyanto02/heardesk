import type { ReportReservation, StagedFile } from "../../usage/domain/usage";
import type { FeedbackType } from "../domain/feedback-repository";
import { cleanupSubmission } from "./cleanup-submission";

export type VisitorInput = Readonly<{ siteKey: string; submissionId: string; fingerprint: string; type: FeedbackType; message: string; email?: string; pageUrl?: string }>;
export interface VisitorFeedbackPorts {
  resolve(key: string): Promise<{ companyId: string; siteId: number } | null>;
  reserve(companyId: string, siteId: number, input: VisitorInput): Promise<ReportReservation | { duplicate: true }>;
  stage(companyId: string, image: Uint8Array): Promise<StagedFile>;
  persist(companyId: string, reservation: ReportReservation, input: VisitorInput, staged: StagedFile | null): Promise<{ duplicate: boolean }>;
  discard(staged: StagedFile): Promise<void>;
  release(companyId: string, reservation: ReportReservation): Promise<void>;
}
export async function submitVisitorFeedback(input: VisitorInput, image: Uint8Array | null, ports: VisitorFeedbackPorts): Promise<{ duplicate: boolean }> {
  const site = await ports.resolve(input.siteKey);
  if (!site) throw Object.assign(new Error("Widget not found"), { code: "WIDGET_NOT_FOUND" });
  const admission = await ports.reserve(site.companyId, site.siteId, input);
  if ("duplicate" in admission) return admission;
  let staged: StagedFile | null = null, persisted = false;
  try {
    if (image) staged = await ports.stage(site.companyId, image);
    const result = await ports.persist(site.companyId, admission, input, staged);
    persisted = !result.duplicate;
    return result;
  } finally {
    await cleanupSubmission(async () => { if (staged && !persisted) await ports.discard(staged); }, () => ports.release(site.companyId, admission));
  }
}
