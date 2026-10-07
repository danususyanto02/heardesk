import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { createCompanyOnboarding } from "@/server/composition/company-onboarding";
import { companyDefaults } from "@/server/company-defaults";
import { CompanyOnboarding } from "@/components/company-onboarding";
import { HttpError } from "@/server/http";
export const dynamic = "force-dynamic";
export default async function Companies() {
  let actor;
  try { actor = await requireActor(); } catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; }
  if (!actor.emailVerified) redirect("/verify-email");
  return <CompanyOnboarding companies={await createCompanyOnboarding(db, companyDefaults()).list(actor)}/>;
}
