import { z } from "zod";
const origin = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash &&
        u.pathname === "/"
      );
    } catch {
      return false;
    }
  }, "Gunakan origin HTTP/HTTPS tanpa path atau query.")
  .transform((value) => new URL(value).origin);
export const types = ["ISSUE", "SUGGESTION", "COMPLIMENT"] as const;
export const statuses = ["NEW", "REVIEWING", "DONE", "ARCHIVED"] as const;
export const typeLabels = { ISSUE: "Masalah", SUGGESTION: "Saran", COMPLIMENT: "Pujian" };
export const statusLabels = {
  NEW: "Baru",
  REVIEWING: "Ditinjau",
  DONE: "Selesai",
  ARCHIVED: "Diarsipkan",
};
export const siteInput = z.object({
  name: z.string().trim().min(1).max(100),
  origin,
  buttonLabel: z.string().trim().min(1).max(40),
  position: z.enum(["left", "right"]),
});
export const setupInput = z.object({
  name: z.string().trim().min(1).max(100).default("Admin"),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(15).max(128),
  token: z.string().min(32).max(256),
});
export const websiteAddress = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Masukkan alamat website HTTP/HTTPS yang valid.")
  .transform((value) => new URL(value).origin);
export const connectSiteInput = z.object({ address: websiteAddress });
export const rotateKeyInput = z.object({
  confirm: z.literal(true),
  expectedKey: z.string().min(1).max(128),
});
export const feedbackInput = z.object({
  siteKey: z.string().min(1).max(128),
  submissionId: z.uuid(),
  type: z.enum(types),
  message: z.string().trim().min(1, "Pesan wajib diisi.").max(5000),
  email: z
    .union([z.literal(""), z.email().max(254)])
    .optional()
    .transform((value) => value || null),
  pageUrl: z.string().max(2048).optional().transform(cleanPageUrl),
});
export const noteInput = z.object({ body: z.string().trim().min(1).max(5000) });
export const statusInput = z.object({ status: z.enum(statuses) });
export function cleanPageUrl(value?: string): string | null {
  if (!value) {
    return null;
  }
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) {
      return null;
    }
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
export function trustedOrigin(value: string | null, appUrl: string): boolean {
  return value === new URL(appUrl).origin;
}
