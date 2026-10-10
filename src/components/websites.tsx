"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CodeIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { Settings } from "./settings";
import { PageSize } from "./page-size";
import { TableSkeleton } from "./skeleton";
type Website = {
  id: number;
  companyId: string;
  name: string;
  origin: string;
  publicKey: string;
  buttonLabel: string;
  position: string;
};
type WebsitePage = {
  items: Website[];
  total: number;
  page: number;
  pageSize: number;
  websiteLimit: number;
};
export function Websites({ companyId }: Readonly<{ companyId: string }>) {
  const params = useSearchParams();
  const [sites, setSites] = useState<WebsitePage | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const siteId = params.get("site");
  const size = Number(params.get("pageSize") ?? 25);
  const page = Number(params.get("page") ?? 1);
  useEffect(() => {
    let current = true;
    setSites(null);
    setLoading(true);
    setError("");
    api<WebsitePage>(`/api/companies/${companyId}/sites?page=${page}&pageSize=${size}`)
      .then((data) => {
        if (current) {
          setSites(data);
        }
      })
      .catch((cause) => {
        if (current) {
          setError(cause.message);
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [companyId, page, size, retry]);
  const base = `/settings?company=${encodeURIComponent(companyId)}`;
  if (siteId) {
    return (
      <>
        <Link className="btn quiet" href={base}>
          Back to Websites
        </Link>
        <Settings key={companyId + ":" + siteId} companyId={companyId} siteId={Number(siteId)} />
      </>
    );
  }
  async function create(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const origin = new URL(address).origin;
      const result = await api<Website>(`/api/companies/${companyId}/sites`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || new URL(address).host,
          origin,
          buttonLabel: "Send feedback",
          position: "right",
        }),
      });
      location.assign(`${base}&site=${result.id}#installation-code`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Websites</h1>
          <p className="muted">
            All websites share this Company's team. Each website has its own installation code.
          </p>
        </div>
      </div>
      {error && (
        <div>
          <p className="error" role="alert">
            {error}
          </p>
          <button type="button" className="btn" onClick={() => setRetry((value) => value + 1)}>
            Retry websites
          </button>
        </div>
      )}
      <div className="websites-layout">
        <div className="websites-list-column">
          {!sites && loading && (
            <section className="platform-panel">
              <TableSkeleton label="Loading websites" columns={4} />
            </section>
          )}
          {sites && (
            <section className="platform-panel">
              <div className="platform-section-heading">
                <h2>
                  {sites.total} of {sites.websiteLimit} websites used
                </h2>
              </div>
              {sites.items.length ? (
                <div className="platform-table-wrap">
                  <table className="platform-table website-table">
                    <thead>
                      <tr>
                        <th>Website</th>
                        <th>Address</th>
                        <th>Installation code</th>
                        <th>Settings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.items.map((site) => (
                        <tr key={site.id}>
                          <td className="navigation-cell">
                            <Link className="cell-link" href={`${base}&site=${site.id}`}>
                              {site.name}
                            </Link>
                          </td>
                          <td data-label="Address">{site.origin}</td>
                          <td
                            data-label="Installation code"
                            className="navigation-cell website-action-cell"
                          >
                            <Link
                              className="cell-link cell-action"
                              aria-label={`Installation code for ${site.name}`}
                              href={`${base}&site=${site.id}#installation-code`}
                            >
                              <CodeIcon size={20} aria-hidden />
                              <span>Installation code</span>
                            </Link>
                          </td>
                          <td data-label="Settings" className="navigation-cell website-action-cell">
                            <Link
                              className="cell-link cell-action"
                              aria-label={`Settings for ${site.name}`}
                              href={`${base}&site=${site.id}#website-settings`}
                            >
                              <SlidersHorizontalIcon size={20} aria-hidden />
                              <span>Settings</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-state">
                  No websites yet. Use Add website to connect your first website.
                </p>
              )}
              <div className="platform-pagination">
                <p className="helper">
                  {sites.total ? (sites.page - 1) * sites.pageSize + 1 : 0}–
                  {Math.min(sites.page * sites.pageSize, sites.total)} of {sites.total}
                </p>
                <div className="pagination-right">
                  <div className="pagination-navigation">
                    {sites.page > 1 && (
                      <Link
                        className="btn"
                        href={`${base}&page=${sites.page - 1}&pageSize=${sites.pageSize}`}
                      >
                        Previous page
                      </Link>
                    )}
                    {sites.page * sites.pageSize < sites.total && (
                      <Link
                        className="btn"
                        href={`${base}&page=${sites.page + 1}&pageSize=${sites.pageSize}`}
                      >
                        Next page
                      </Link>
                    )}
                  </div>
                  <PageSize value={sites.pageSize} />
                </div>
              </div>
            </section>
          )}
        </div>
        <section className="onboarding-panel website-add">
          <h2>Add website</h2>
          <form className="form-stack" onSubmit={create}>
            <label>
              <span>Website name</span>
              <input
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              <span>Website address</span>
              <input
                type="url"
                required
                value={address}
                maxLength={2048}
                placeholder="https://your-website.com"
                onChange={(event) => setAddress(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={busy || (!!sites && sites.total >= sites.websiteLimit)}
            >
              {busy ? "Adding..." : "Add website"}
            </button>
            {sites && sites.total >= sites.websiteLimit && (
              <p className="helper">
                Website allowance reached. Ask the platform owner to adjust your allowance.
              </p>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
