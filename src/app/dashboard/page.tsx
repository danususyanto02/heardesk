import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { HttpError } from "@/server/http";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  let actor;
  try { actor = await requireActor(); } catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; }
  if (!actor.emailVerified) redirect("/verify-email");
  redirect(actor.platformRole === "PLATFORM_OWNER" ? "/platform/overview" : "/companies");
}
