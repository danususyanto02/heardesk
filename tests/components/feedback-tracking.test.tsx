// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import { FeedbackTracking } from "@/components/feedback-tracking";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  history.replaceState(null, "", "/");
});
it("loads the new bearer when fragment changes and clears report on empty fragment", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    Response.json({
      website: "Shop",
      message: JSON.parse(options.body as string).code === "a".repeat(48) ? "Report A" : "Report B",
      type: "ISSUE",
      status: "NEW",
      createdAt: "2026-10-10",
      updatedAt: "2026-10-10",
      replies: [],
    }),
  );
  history.replaceState(null, "", "/track#code=" + "a".repeat(48));
  render(<FeedbackTracking />);
  await screen.findByText("Report A");
  history.replaceState(null, "", "/track#code=" + "b".repeat(48));
  fireEvent(window, new HashChangeEvent("hashchange"));
  await screen.findByText("Report B");
  expect(screen.queryByText("Report A")).toBeNull();
  history.replaceState(null, "", "/track");
  fireEvent(window, new HashChangeEvent("hashchange"));
  expect(screen.queryByText("Report B")).toBeNull();
});

const report = {
  website: "Shop",
  message: "Checkout broken",
  type: "ISSUE",
  status: "NEW",
  createdAt: "2026-10-10T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
  replies: [],
};

function enterCode(value: string) {
  fireEvent.change(screen.getByLabelText("Kode pelacakan"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Lihat perkembangan" }));
}

it("rejects an incomplete code locally without exposing a report", async () => {
  vi.stubGlobal("fetch", () => {
    throw new Error("Invalid code must not leave the browser");
  });
  render(<FeedbackTracking />);
  enterCode("abc");
  expect((await screen.findByRole("alert")).textContent).toContain("kode pelacakan lengkap");
  expect(screen.queryByRole("article", { name: "Hasil pelacakan" })).toBeNull();
  expect(
    (screen.getByRole("button", { name: "Lihat perkembangan" }) as HTMLButtonElement).disabled,
  ).toBe(false);
});

it("submits a normalized code privately and refreshes status and public replies", async () => {
  let attempt = 0;
  vi.stubGlobal("fetch", async (path: string, options: RequestInit) => {
    if (
      path !== "/api/feedback/track" ||
      options.method !== "POST" ||
      options.credentials !== "omit" ||
      options.cache !== "no-store" ||
      JSON.parse(options.body as string).code !== "a".repeat(48)
    ) {
      return Response.json({ error: { message: "Unsafe tracking request" } }, { status: 400 });
    }
    attempt++;
    return Response.json(
      attempt === 1
        ? report
        : {
            ...report,
            status: "DONE",
            replies: [
              { id: "reply", body: "Checkout has been fixed.", createdAt: "2026-10-11T00:00:00Z" },
            ],
          },
    );
  });
  render(<FeedbackTracking />);
  enterCode("A".repeat(48));
  await screen.findByText("Checkout broken");
  expect(screen.getByText("Baru")).toBeTruthy();
  expect(screen.getByText("Belum ada pembaruan dari tim.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Perbarui status" }));
  await screen.findByText("Checkout has been fixed.");
  expect(screen.getByText("Selesai")).toBeTruthy();
  expect(screen.queryByText("Belum ada pembaruan dari tim.")).toBeNull();
});

it("announces an API error and allows a corrected code to recover", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    JSON.parse(options.body as string).code === "b".repeat(48)
      ? Response.json(report)
      : Response.json(
          { error: { message: "Feedback tidak ditemukan. Periksa kode pelacakan Anda." } },
          { status: 404 },
        ),
  );
  render(<FeedbackTracking />);
  enterCode("a".repeat(48));
  expect((await screen.findByRole("alert")).textContent).toContain("Feedback tidak ditemukan");
  expect(screen.queryByRole("article", { name: "Hasil pelacakan" })).toBeNull();
  enterCode("b".repeat(48));
  await screen.findByText("Checkout broken");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("does not replace the current report with an older lookup response", async () => {
  let resolveOld!: (response: Response) => void;
  vi.stubGlobal("fetch", (_path: string, options: RequestInit) =>
    JSON.parse(options.body as string).code === "a".repeat(48)
      ? new Promise<Response>((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve(Response.json({ ...report, message: "Current report" })),
  );
  render(<FeedbackTracking />);
  enterCode("a".repeat(48));
  expect(screen.getByText("Memuat status dan balasan tim…")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Mencari feedback…" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  enterCode("b".repeat(48));
  await screen.findByText("Current report");
  await act(async () => {
    resolveOld(Response.json({ ...report, message: "Obsolete report" }));
  });
  expect(screen.queryByText("Obsolete report")).toBeNull();
  expect(screen.getByText("Current report")).toBeTruthy();
});

it("does not display an old request failure or stop a newer lookup while it is loading", async () => {
  let rejectOld!: (error: Error) => void;
  let resolveNew!: (response: Response) => void;
  vi.stubGlobal("fetch", (_path: string, options: RequestInit) =>
    JSON.parse(options.body as string).code === "a".repeat(48)
      ? new Promise<Response>((_resolve, reject) => {
          rejectOld = reject;
        })
      : new Promise<Response>((resolve) => {
          resolveNew = resolve;
        }),
  );
  render(<FeedbackTracking />);
  enterCode("a".repeat(48));
  enterCode("b".repeat(48));
  await act(async () => {
    rejectOld(new Error("Old request failed"));
  });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Memuat status dan balasan tim…")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Mencari feedback…" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  await act(async () => {
    resolveNew(Response.json(report));
  });
  expect(screen.getByText("Checkout broken")).toBeTruthy();
  expect(screen.queryByText("Memuat status dan balasan tim…")).toBeNull();
});
