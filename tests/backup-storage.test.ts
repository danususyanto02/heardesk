import { expect, it } from "vitest";
import { validateAttachmentBackup } from "../scripts/backup-validation";
it("backup must contain each database attachment with matching byte size", () => {
  expect(() => validateAttachmentBackup([{ key: "missing.webp", size: 123 }], new Map())).toThrow(
    /missing/i,
  );
  expect(() =>
    validateAttachmentBackup([{ key: "image.webp", size: 123 }], new Map([["image.webp", 12]])),
  ).toThrow(/size/i);
  expect(() =>
    validateAttachmentBackup([{ key: "image.webp", size: 123 }], new Map([["image.webp", 123]])),
  ).not.toThrow();
});
