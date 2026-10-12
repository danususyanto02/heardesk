import { createHash } from "node:crypto";

export function trackingHash(code: string): string {
  if (!/^[a-f0-9]{48}$/.test(code)) {
    throw Object.assign(new Error("Kode pelacakan tidak valid."), { code: "VALIDATION_ERROR" });
  }
  return createHash("sha256").update(code).digest("hex");
}
