import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { HttpError } from "@/server/http";
import { db } from "@/server/db";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireAdmin(); } catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; }
  const site = await db.site.findUnique({ where: { id: 1 } });
  return <AppShell siteName={site ? new URL(site.origin).host : "Website belum terhubung"}>{children}</AppShell>;
}
