import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { FeedbackForm } from "@/components/feedback-form";
export const dynamic = "force-dynamic";
export default async function Widget({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ parentOrigin?: string }> }) {
  const { key } = await params, query = await searchParams, site = await db.site.findFirst({ where: { publicKey: key, company: { profile: { status: "ACTIVE" } } } });
  if (!site || (query.parentOrigin && ![site.origin, new URL(env().APP_URL).origin].includes(query.parentOrigin))) notFound();
  return <main className="widget-page"><FeedbackForm siteKey={key} name={site.name} parentOrigin={query.parentOrigin} position={site.position} buttonLabel={site.buttonLabel}/></main>;
}
