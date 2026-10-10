// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  CompanyTable,
  formatBytes,
  PlatformPagination,
  PlatformSearch,
  UsageValue,
} from "@/components/platform-data";
import type { PlatformCompany } from "@/modules/platform/domain/platform-repository";
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => "/platform/companies",
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(cleanup);
it.each([
  ["0", "0 B"],
  ["1024", "1 KiB"],
  ["1048576", "1 MiB"],
  ["1073741824", "1 GiB"],
])("formats %s bytes", (value, expected) => {
  expect(formatBytes(value)).toBe(expected);
});
it("shows quota states and exact formatted storage", () => {
  render(<UsageValue used="1024" limit="2048" bytes />);
  expect(screen.getByText("1 KiB / 2 KiB")).toBeTruthy();
});
it("preserves search and page size in pagination destinations", () => {
  render(
    <PlatformPagination
      data={{ items: [], total: 60, page: 2, pageSize: 25 }}
      query={{ q: "Team X", page: 2 }}
      path="/platform/companies"
    />,
  );
  expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toBe(
    "/platform/companies?q=Team+X&page=3&pageSize=25",
  );
  expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toContain(
    "page=1",
  );
});
it("keeps query value and page size in GET search form", () => {
  render(<PlatformSearch query={{ q: "Team X", page: 1 }} placeholder="Search companies" />);
  const input = screen.getByLabelText("Search") as HTMLInputElement;
  expect(input.value).toBe("Team X");
  expect(input.closest("form")!.method).toBe("get");
  expect(
    input.closest("form")!.querySelector<HTMLInputElement>('input[name="pageSize"]')!.value,
  ).toBe("25");
});
const company: PlatformCompany = {
  id: "x",
  name: "Team X",
  status: "ACTIVE",
  reason: null,
  createdAt: "2026-10-10",
  updatedAt: "2026-10-10",
  owners: [],
  members: 2,
  occupiedSeats: 3,
  websites: 1,
  reports: 10,
  monthlyReports: 5,
  period: "2026-10",
  storedBytes: "1024",
  limits: { websites: 3, seats: 5, monthlyReports: 100, storageBytes: "2048" },
};
it("renders metadata-only Company links and missing owner state", () => {
  render(<CompanyTable companies={[company]} />);
  expect(screen.getByRole("link", { name: "Team X" }).getAttribute("href")).toBe(
    "/platform/companies/x",
  );
  expect(screen.getByText("No owner recorded")).toBeTruthy();
});
it("shows reserved invites in occupied seats rather than only members", () => {
  render(<CompanyTable companies={[company]} usage />);
  expect(screen.getByText("3 / 5")).toBeTruthy();
  expect(screen.getByText(/2 members · 1 reserved invites/)).toBeTruthy();
});
