import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { HttpError } from "@/server/http";
import { defaultSite } from "@/server/site";
import { AppShell } from "@/components/app-shell";
import { cookies } from "next/headers";
import { db } from "@/server/db";
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireActor(); } catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; }
  const site = await defaultSite();
  const actor = await requireActor(), selected = (await cookies()).get("heardesk-company")?.value;
  const membership = await db.member.findFirst({ where: { userId: actor.userId, ...(selected ? { organizationId: selected } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  if (selected && !membership) redirect("/companies");
  return <div data-company-id={membership?.organizationId ?? ""}><AppShell siteName={site ? new URL(site.origin).host : "Website belum terhubung"}>{children}</AppShell></div>;
}
