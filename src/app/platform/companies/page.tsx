import { platformServices } from "@/server/platform-access";
import { platformQuery } from "@/server/platform-query";
import { CompanyTable, PlatformSearch, PlatformPagination } from "@/components/platform-data";
export default async function Companies({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = platformQuery(await searchParams);
  const data = await platformServices().companies(query);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Companies</h1>
          <p className="muted">Manage client account status and allowances.</p>
        </div>
      </div>
      <section className="platform-panel">
        <PlatformSearch query={query} placeholder="Search Company name or ID" />
        {data.items.length ? (
          <CompanyTable companies={data.items} />
        ) : (
          <p className="empty-state">
            No Companies match this search. Clear the search to view all accounts.
          </p>
        )}
        <PlatformPagination data={data} query={query} path="/platform/companies" />
      </section>
    </>
  );
}
