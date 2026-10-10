// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { PlatformShell } from "@/components/platform-shell";
const navigation = vi.hoisted(() => ({ path: "/inbox", replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  usePathname: () => navigation.path,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  navigation.replace.mockClear();
});
it("keeps Company links explicit and clears only private note drafts after logout", async () => {
  sessionStorage.setItem("note-draft:r1", "Private note");
  sessionStorage.setItem("unrelated", "keep");
  vi.stubGlobal("fetch", async () => Response.json({ success: true }));
  render(
    <AppShell companyId="x" siteName="Shop">
      Reports
    </AppShell>,
  );
  expect(screen.getByRole("link", { name: "Website" }).getAttribute("href")).toBe(
    "/settings?company=x",
  );
  expect(screen.getByRole("link", { name: "Laporan" }).getAttribute("aria-current")).toBe("page");
  fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  expect(sessionStorage.getItem("note-draft:r1")).toBeNull();
  expect(sessionStorage.getItem("unrelated")).toBe("keep");
});
it("preserves drafts and current page when Company logout fails", async () => {
  vi.stubGlobal("fetch", async () => Response.json({}, { status: 503 }));
  sessionStorage.setItem("note-draft:r1", "Private note");
  render(<AppShell siteName="Shop">Reports</AppShell>);
  fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
  await screen.findByRole("alert");
  expect(sessionStorage.getItem("note-draft:r1")).toBe("Private note");
  expect(navigation.replace).not.toHaveBeenCalled();
});
it("marks nested Company platform pages active and offers retry after sign-out failure", async () => {
  navigation.path = "/platform/companies/x";
  vi.stubGlobal("fetch", async () => Response.json({}, { status: 503 }));
  render(<PlatformShell>Company metadata</PlatformShell>);
  expect(screen.getByRole("link", { name: "Companies" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Open Company Dashboard" }).getAttribute("href")).toBe(
    "/companies",
  );
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Sign out failed");
});
