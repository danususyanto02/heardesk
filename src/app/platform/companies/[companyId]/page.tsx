import Link from "next/link";
import { platformServices } from "@/server/platform-access";
import { PlatformCompanyEditor } from "@/components/platform-company";
import { formatBytes } from "@/components/platform-data";
import { notFound } from "next/navigation";
export default async function CompanyDetail({ params }: { params: Promise<{ companyId: string }> }) {
  let company;
  try { company = await platformServices().company((await params).companyId); } catch (error) { if (error instanceof Error && "code" in error && error.code === "PLATFORM_NOT_FOUND") notFound(); throw error; }
  return <><Link className="btn quiet" href="/platform/companies">Back to Companies</Link><div className="page-heading"><div><h1>{company.name}</h1><p className="muted">{company.owners.map(owner => owner.email).join(", ") || "No Company Owner recorded"}</p></div></div><section className="platform-summary"><dl>{[["Websites", company.websites], ["Members", company.members], ["Reports this month", company.monthlyReports], ["Storage", formatBytes(company.storedBytes)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><PlatformCompanyEditor initial={company}/></>;
}
