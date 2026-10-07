import Link from "next/link";
import type { PlatformCompany, PlatformPage, PlatformQuery } from "@/modules/platform/domain/platform-repository";
export function formatBytes(value: string): string {
  const bytes = BigInt(value);
  if (bytes >= 1073741824n) return `${Number(bytes * 100n / 1073741824n) / 100} GiB`;
  if (bytes >= 1048576n) return `${Number(bytes * 100n / 1048576n) / 100} MiB`;
  if (bytes >= 1024n) return `${Number(bytes * 100n / 1024n) / 100} KiB`;
  return `${bytes} B`;
}
export function PlatformSearch({ query, placeholder }: { query: PlatformQuery; placeholder: string }) { return <form className="platform-search" method="get"><label htmlFor="platform-search" className="sr-only">Search</label><input id="platform-search" name="q" defaultValue={query.q} placeholder={placeholder} maxLength={200}/><button className="btn">Search</button></form>; }
export function PlatformPagination({ data, query, path }: { data: PlatformPage<unknown>; query: PlatformQuery; path: string }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const url = (page: number) => `${path}?${new URLSearchParams({ q: query.q, page: String(page) })}`;
  return <div className="platform-pagination"><p className="helper">{data.total} results · Page {data.page} of {pages}</p><div>{data.page > 1 && <Link className="btn" href={url(data.page - 1)}>Previous page</Link>}{data.page < pages && <Link className="btn" href={url(data.page + 1)}>Next page</Link>}</div></div>;
}
export function CompanyTable({ companies, usage = false }: { companies: readonly PlatformCompany[]; usage?: boolean }) {
  return <div className="platform-table-wrap"><table className="platform-table"><thead><tr><th>Company</th>{usage ? <><th>Websites / limit</th><th>Members / seats</th><th>Reports this month / limit</th><th>Storage / limit</th></> : <><th>Status</th><th>Company Owner</th><th>Websites</th><th>Reports</th></>}</tr></thead><tbody>{companies.map(company => <tr key={company.id}><td data-label="Company"><Link href={`/platform/companies/${company.id}`}>{company.name}</Link></td>{usage ? <><td data-label="Websites / limit">{company.websites} / {company.limits.websites}</td><td data-label="Members / seats">{company.members} / {company.limits.seats}</td><td data-label="Monthly reports"><div>{company.monthlyReports} / {company.limits.monthlyReports}<span className="helper">{company.period} UTC</span></div></td><td data-label="Storage / limit">{formatBytes(company.storedBytes)} / {formatBytes(company.limits.storageBytes)}</td></> : <><td data-label="Status">{company.status === "ACTIVE" ? "Active" : "Suspended"}</td><td data-label="Company Owner">{company.owners.length ? company.owners.map(owner => <div key={owner.id}>{owner.name}<span className="helper">{owner.email}</span></div>) : "No owner recorded"}</td><td data-label="Websites">{company.websites}</td><td data-label="Reports">{company.reports}</td></>}</tr>)}</tbody></table></div>;
}
