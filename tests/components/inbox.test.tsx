// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { Inbox } from "@/components/inbox";

const navigation = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => navigation.params,
  usePathname: () => "/inbox",
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/inbox-statistics", () => ({ InboxStatistics: () => null }));
vi.mock("@/components/inbox-filter", () => ({ InboxFilter: () => null }));

beforeEach(() => {
  navigation.params = new URLSearchParams("company=x");
  navigation.replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const empty = { items: [], total: 0, page: 1, pageSize: 25 };
const item = {
  id: "report-1",
  message: "Checkout broken",
  type: "ISSUE",
  status: "NEW",
  createdAt: "2026-10-10T00:00:00Z",
  attachment: { id: "image" },
};

function serve(result: unknown) {
  vi.stubGlobal("fetch", async (path: string) =>
    Response.json(path.includes("/sites?") ? empty : result),
  );
}

it("shows an empty Company inbox with a scoped installation link", async () => {
  serve(empty);
  render(<Inbox />);
  await screen.findByRole("heading", { name: "Belum ada feedback" });
  expect(screen.getByRole("link", { name: "Pasang widget" }).getAttribute("href")).toBe(
    "/settings?company=x",
  );
  expect(screen.getByRole("button", { name: "Halaman berikutnya" }).hasAttribute("disabled")).toBe(
    true,
  );
});

it("resets a filtered empty inbox without dropping the Company", async () => {
  navigation.params = new URLSearchParams("company=x&q=missing&type=ISSUE");
  serve(empty);
  render(<Inbox />);
  await screen.findByRole("heading", { name: "Tidak ada feedback yang cocok" });
  fireEvent.click(screen.getByRole("button", { name: "Reset pencarian" }));
  expect(navigation.replace).toHaveBeenCalledWith("/inbox?company=x");
});

it("keeps detail links and pagination bound to the active Company and filters", async () => {
  navigation.params = new URLSearchParams("company=x&q=checkout&page=2");
  serve({ items: [item], total: 60, page: 2, pageSize: 25 });
  render(<Inbox />);
  const link = await screen.findByRole("link", { name: "Checkout broken" });
  expect(link.getAttribute("href")).toContain("/inbox/report-1?company=x&return=");
  expect(screen.getByText("1 screenshot")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
  expect(navigation.replace).toHaveBeenCalledWith("/inbox?company=x&q=checkout&page=3", {
    scroll: false,
  });
  fireEvent.change(screen.getByLabelText("Cari isi feedback"), { target: { value: "new search" } });
  fireEvent.click(screen.getByRole("button", { name: "Cari" }));
  expect(navigation.replace).toHaveBeenCalledWith("/inbox?company=x&q=new+search", {
    scroll: false,
  });
});

it("retries failed loading and replaces the error with feedback", async () => {
  let failed = true;
  vi.stubGlobal("fetch", async (path: string) => {
    if (path.includes("/sites?")) {
      return Response.json(empty);
    }
    return failed
      ? Response.json({ error: { message: "Temporarily unavailable" } }, { status: 503 })
      : Response.json({ ...empty, items: [item], total: 1 });
  });
  render(<Inbox />);
  expect((await screen.findByRole("alert")).textContent).toBe("Temporarily unavailable");
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  await screen.findByRole("link", { name: "Checkout broken" });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("ignores a late response from the previously selected Company", async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal("fetch", (path: string) => {
    if (path.includes("/sites?")) {
      return Promise.resolve(Response.json(empty));
    }
    if (path.includes("company=x")) {
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Promise.resolve(
      Response.json({ ...empty, items: [{ ...item, message: "Company Y report" }], total: 1 }),
    );
  });
  const view = render(<Inbox />);
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  navigation.params = new URLSearchParams("company=y");
  view.rerender(<Inbox />);
  await screen.findByRole("link", { name: "Company Y report" });
  await act(async () => {
    finish(Response.json({ ...empty, items: [item], total: 1 }));
  });
  expect(screen.queryByRole("link", { name: "Checkout broken" })).toBeNull();
  expect(screen.getByRole("link", { name: "Company Y report" }).getAttribute("href")).toContain(
    "company=y",
  );
});
