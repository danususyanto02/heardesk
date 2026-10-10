// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Websites } from "@/components/websites";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.params,
  usePathname: () => "/settings",
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/settings", () => ({
  Settings: ({ companyId, siteId }: { companyId: string; siteId: number }) => (
    <p>
      Selected {companyId}/{siteId}
    </p>
  ),
}));
beforeEach(() => {
  navigation.params = new URLSearchParams();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const page = {
  items: [{ id: 7, companyId: "x", name: "Shop", origin: "https://shop.example.test" }],
  total: 51,
  page: 2,
  pageSize: 25,
  websiteLimit: 100,
};

it("renders scoped installation/settings and pagination links", async () => {
  vi.stubGlobal("fetch", async () => Response.json(page));
  render(<Websites companyId="x" />);
  const installation = await screen.findByRole("link", { name: "Installation code for Shop" });
  expect(installation.getAttribute("href")).toBe("/settings?company=x&site=7#installation-code");
  expect(screen.getByRole("link", { name: "Settings for Shop" }).getAttribute("href")).toBe(
    "/settings?company=x&site=7#website-settings",
  );
  expect(screen.getByRole("link", { name: "Next page" }).getAttribute("href")).toContain(
    "page=3&pageSize=25",
  );
  expect(screen.getByRole("link", { name: "Previous page" }).getAttribute("href")).toContain(
    "page=1&pageSize=25",
  );
});

it("disables creation at the Company allowance and renders empty usage", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ ...page, items: [], total: 0, page: 1, websiteLimit: 0 }),
  );
  render(<Websites companyId="x" />);
  await screen.findByText(/No websites yet/);
  expect(screen.getByRole("button", { name: "Add website" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/Website allowance reached/)).toBeTruthy();
});

it("retries failed listing without losing the add form", async () => {
  let fail = true;
  vi.stubGlobal("fetch", async () =>
    fail
      ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
      : Response.json(page),
  );
  render(<Websites companyId="x" />);
  await screen.findByRole("alert");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry websites" }));
  await screen.findByRole("link", { name: "Shop" });
  expect(screen.getByLabelText("Website address")).toBeTruthy();
});

it("normalizes the address and preserves the form after rejected creation", async () => {
  let submitted: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    if (options.method === "POST") {
      submitted = JSON.parse(options.body as string);
      return Response.json({ error: { message: "Quota exhausted" } }, { status: 422 });
    }
    return Response.json(page);
  });
  render(<Websites companyId="x" />);
  await screen.findByRole("link", { name: "Shop" });
  fireEvent.change(screen.getByLabelText("Website address"), {
    target: { value: "https://new.example.test/path?q=private" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add website" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Quota exhausted");
  expect(submitted).toEqual({
    name: "new.example.test",
    origin: "https://new.example.test",
    buttonLabel: "Send feedback",
    position: "right",
  });
});

it("selects website settings with explicit Company and site context", async () => {
  navigation.params = new URLSearchParams("site=7");
  vi.stubGlobal("fetch", async () => Response.json(page));
  render(<Websites companyId="x" />);
  await screen.findByText("Selected x/7");
  expect(screen.getByRole("link", { name: "Back to Websites" }).getAttribute("href")).toBe(
    "/settings?company=x",
  );
});
