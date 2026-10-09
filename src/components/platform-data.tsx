import Link from "next/link";
import type {
  PlatformCompany,
  PlatformPage,
  PlatformQuery,
} from "@/modules/platform/domain/platform-repository";
import { PageSize } from "./page-size";
import { usageStatus } from "@/modules/usage/domain/usage-status";
export function formatBytes(value: string): string {
  const bytes = BigInt(value);
  if (bytes >= 1073741824n) {
    return `${Number((bytes * 100n) / 1073741824n) / 100} GiB`;
  }
  if (bytes >= 1048576n) {
    return `${Number((bytes * 100n) / 1048576n) / 100} MiB`;
  }
  if (bytes >= 1024n) {
    return `${Number((bytes * 100n) / 1024n) / 100} KiB`;
  }
  return `${bytes} B`;
}
export function UsageValue({
  used,
  limit,
  bytes = false,
}: Readonly<{
  used: number | string;
  limit: number | string;
  bytes?: boolean;
}>) {
  const result = usageStatus(BigInt(used), BigInt(limit));
  return (
    <div className={`usage-value usage-${result.state}`}>
      <strong>
        {bytes ? formatBytes(String(used)) : used} / {bytes ? formatBytes(String(limit)) : limit}
      </strong>
      <span>
        {result.label}
        {result.percent === null ? "" : ` · ${result.percent}%`}
      </span>
    </div>
  );
}
export function PlatformSearch({
  query,
  placeholder,
}: Readonly<{
  query: PlatformQuery;
  placeholder: string;
}>) {
  return (
    <form className="platform-search" method="get">
      <input type="hidden" name="pageSize" value={query.pageSize ?? 25} />
      <label htmlFor="platform-search" className="sr-only">
        Search
      </label>
      <input
        id="platform-search"
        name="q"
        defaultValue={query.q}
        placeholder={placeholder}
        maxLength={200}
      />
      <button type="submit" className="btn">
        Search
      </button>
    </form>
  );
}
export function PlatformPagination({
  data,
  query,
  path,
}: Readonly<{
  data: PlatformPage<unknown>;
  query: PlatformQuery;
  path: string;
}>) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const url = (page: number) =>
    `${path}?${new URLSearchParams({ q: query.q, page: String(page), pageSize: String(data.pageSize) })}`;
  return (
    <div className="platform-pagination">
      <p className="helper">
        {data.total ? (data.page - 1) * data.pageSize + 1 : 0}–
        {Math.min(data.page * data.pageSize, data.total)} of {data.total} · Page {data.page} of{" "}
        {pages}
      </p>
      <div className="pagination-right">
        <div className="pagination-navigation">
          {data.page > 1 && (
            <Link className="btn" href={url(data.page - 1)}>
              Previous page
            </Link>
          )}
          {data.page < pages && (
            <Link className="btn" href={url(data.page + 1)}>
              Next page
            </Link>
          )}
        </div>
        <PageSize value={data.pageSize} />
      </div>
    </div>
  );
}
export function CompanyTable({
  companies,
  usage = false,
}: Readonly<{
  companies: readonly PlatformCompany[];
  usage?: boolean;
}>) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-table">
        <thead>
          <tr>
            <th>Company</th>
            {usage ? (
              <>
                <th>Websites / limit</th>
                <th>Occupied seats / limit</th>
                <th>Reports this month / limit</th>
                <th>Storage / limit</th>
              </>
            ) : (
              <>
                <th>Status</th>
                <th>Company Owner</th>
                <th>Websites</th>
                <th>Reports</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td data-label="Company" className="navigation-cell">
                <Link className="cell-link" href={`/platform/companies/${company.id}`}>
                  {company.name}
                </Link>
              </td>
              {usage ? (
                <>
                  <td data-label="Websites / limit">
                    <UsageValue used={company.websites} limit={company.limits.websites} />
                  </td>
                  <td data-label="Occupied seats">
                    <UsageValue
                      used={company.occupiedSeats ?? company.members}
                      limit={company.limits.seats}
                    />
                    <span className="helper">
                      {company.members} members ·{" "}
                      {(company.occupiedSeats ?? company.members) - company.members} reserved
                      invites
                    </span>
                  </td>
                  <td data-label="Monthly reports">
                    <UsageValue
                      used={company.monthlyReports}
                      limit={company.limits.monthlyReports}
                    />
                    <span className="helper">{company.period} UTC</span>
                  </td>
                  <td data-label="Storage / limit">
                    <UsageValue
                      used={company.storedBytes}
                      limit={company.limits.storageBytes}
                      bytes
                    />
                  </td>
                </>
              ) : (
                <>
                  <td data-label="Status">
                    {company.status === "ACTIVE" ? "Active" : "Suspended"}
                  </td>
                  <td data-label="Company Owner">
                    {company.owners.length
                      ? company.owners.map((owner) => (
                          <div key={owner.id}>
                            {owner.name}
                            <span className="helper">{owner.email}</span>
                          </div>
                        ))
                      : "No owner recorded"}
                  </td>
                  <td data-label="Websites">{company.websites}</td>
                  <td data-label="Reports">{company.reports}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
