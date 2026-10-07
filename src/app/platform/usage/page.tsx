import { platformServices } from "@/server/platform-access";
import { platformQuery } from "@/server/platform-query";
import { CompanyTable, PlatformSearch, PlatformPagination } from "@/components/platform-data";
export default async function Usage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = platformQuery(await searchParams), data = await platformServices().companies(query);
  return <><div className="page-heading"><div><h1>Company usage</h1><p className="muted">Current committed use against configured allowances. Monthly reports use the UTC calendar.</p></div></div><section className="platform-panel"><PlatformSearch query={query} placeholder="Search Company name or ID"/>{data.items.length ? <CompanyTable companies={data.items} usage/> : <p className="empty-state">No Company usage matches this search.</p>}<PlatformPagination data={data} query={query} path="/platform/usage"/></section></>;
}
