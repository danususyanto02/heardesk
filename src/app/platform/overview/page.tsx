import Link from "next/link";
import { platformServices } from "@/server/platform-access";
import { formatBytes, CompanyTable } from "@/components/platform-data";
import {PlatformCharts} from "@/components/platform-charts";
export default async function Overview() {
  const services = platformServices(), overview = await services.overview(), companies = await services.companies({ q: "", page: 1 });
  return <><div className="page-heading"><div><h1>Platform overview</h1><p className="muted">Client accounts and resource use across HearDesk.</p></div></div><section className="platform-summary" aria-label="Service totals"><dl>{[["Companies", overview.companies], ["Users", overview.users], ["Websites", overview.websites], ["Reports stored", overview.reports], ["Screenshot storage", formatBytes(overview.storedBytes)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section><PlatformCharts active={overview.activeCompanies} suspended={overview.suspendedCompanies}/><section className="platform-panel"><div className="platform-section-heading"><div><h2>Recently created Companies</h2><p className="helper">Account metadata only. Feedback messages and screenshots are not shown here.</p></div><Link className="btn" href="/platform/companies">View all Companies</Link></div>{companies.items.length ? <CompanyTable companies={companies.items.slice(0, 5)}/> : <p className="empty-state">No client Companies yet. They will appear after verified users complete onboarding.</p>}</section></>;
}
