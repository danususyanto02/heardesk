// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Detail } from "@/components/detail";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
const report = {
  id: "r1",
  type: "ISSUE",
  status: "NEW",
  message: "Broken checkout",
  email: null,
  pageUrl: null,
  createdAt: "2026-10-10T00:00:00Z",
  attachment: null,
  notes: [],
};

it("never renders prior report reply controls after next report fails to load", async () => {
  vi.stubGlobal("fetch", async (path: string) =>
    path.endsWith("r1")
      ? Response.json({ ...report, trackingEnabled: true })
      : Response.json({ error: { message: "Unavailable" } }, { status: 503 }),
  );
  const view = render(<Detail id="r1" back="/inbox" />);
  await screen.findByLabelText("Balasan publik");
  view.rerender(<Detail id="r2" back="/inbox" />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Broken checkout")).toBeNull();
  expect(screen.queryByLabelText("Balasan publik")).toBeNull();
});

it("renders absent context and restores a report-specific note draft", async () => {
  sessionStorage.setItem("note-draft:r1", "Follow up tomorrow");
  vi.stubGlobal("fetch", async () => Response.json(report));
  render(<Detail id="r1" back="/inbox?company=x" />);
  await screen.findByRole("heading", { name: "Detail feedback" });
  expect(screen.getAllByText("Tidak disertakan")).toHaveLength(2);
  expect((screen.getByLabelText("Tambah catatan") as HTMLTextAreaElement).value).toBe(
    "Follow up tomorrow",
  );
  expect(screen.getByRole("link", { name: "Kembali ke feedback" }).getAttribute("href")).toBe(
    "/inbox?company=x",
  );
});

it("changes status only after persistence and announces success", async () => {
  let submitted: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    if (options.method === "PATCH") {
      submitted = JSON.parse(options.body as string);
      return Response.json({ ok: true });
    }
    return Response.json(report);
  });
  render(<Detail id="r1" back="/inbox" />);
  const status = await screen.findByLabelText("Status");
  fireEvent.change(status, { target: { value: "ARCHIVED" } });
  await screen.findByText("Status tersimpan.");
  expect((status as HTMLSelectElement).value).toBe("ARCHIVED");
  expect(submitted).toEqual({ status: "ARCHIVED" });
});

it("keeps the prior status and note draft when their writes fail", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    options.method
      ? Response.json({ error: { message: "Write denied" } }, { status: 403 })
      : Response.json(report),
  );
  render(<Detail id="r1" back="/inbox" />);
  const status = await screen.findByLabelText("Status");
  fireEvent.change(status, { target: { value: "ARCHIVED" } });
  expect((await screen.findByRole("alert")).textContent).toContain("Status belum diubah");
  expect((status as HTMLSelectElement).value).toBe("NEW");
  fireEvent.change(screen.getByLabelText("Tambah catatan"), {
    target: { value: "Keep this draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Tambah catatan" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Write denied"));
  expect(sessionStorage.getItem("note-draft:r1")).toBe("Keep this draft");
});

it("appends a saved note and clears the persisted draft", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    options.method === "POST"
      ? Response.json({ id: "n1", body: "Investigating", createdAt: report.createdAt })
      : Response.json(report),
  );
  render(<Detail id="r1" back="/inbox" />);
  await screen.findByRole("heading", { name: "Detail feedback" });
  fireEvent.change(screen.getByLabelText("Tambah catatan"), { target: { value: "Investigating" } });
  fireEvent.click(screen.getByRole("button", { name: "Tambah catatan" }));
  await screen.findByText("Investigating");
  expect((screen.getByLabelText("Tambah catatan") as HTMLTextAreaElement).value).toBe("");
  expect(sessionStorage.getItem("note-draft:r1")).toBe("");
});

it("retries a failed detail load and shows screenshot and safe page context", async () => {
  let fail = true;
  vi.stubGlobal("fetch", async () =>
    fail
      ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
      : Response.json({
          ...report,
          email: "person@example.test",
          pageUrl: "https://example.test/checkout",
          attachment: { id: "a1", filename: "checkout.webp" },
        }),
  );
  render(<Detail id="r1" back="/inbox" />);
  await screen.findByRole("alert");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  expect(
    (await screen.findByAltText("Screenshot yang diunggah pengunjung")).getAttribute("src"),
  ).toBe("/api/admin/attachments/a1");
  const link = screen.getByText("https://example.test/checkout");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
});
