import { expect, it } from "vitest";
import { cleanupSubmission } from "@/modules/feedback/application/cleanup-submission";
it("releases report reservation even when staged-file cleanup fails", async () => {
  const released: string[] = [];
  await expect(cleanupSubmission(async () => { throw new Error("disk failure"); }, async () => { released.push("report"); })).rejects.toThrow("disk failure");
  expect(released).toEqual(["report"]);
});
