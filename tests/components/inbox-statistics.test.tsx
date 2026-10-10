// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InboxStatistics } from "@/components/inbox-statistics";

const charts = vi.hoisted(() => ({ chart: vi.fn(), destroy: vi.fn(), setSize: vi.fn() }));
vi.mock("highcharts", () => ({ default: { chart: charts.chart } }));
vi.mock("highcharts/modules/accessibility", () => ({}));
const totals = { issues: 2, suggestions: 1, compliments: 0, total: 3 };
const statistics = {
  websiteName: "Shop",
  years: [2025, 2026],
  totals,
  rows: [{ label: "2026-01", ...totals }],
};
beforeEach(() => {
  charts.chart.mockReset();
  charts.destroy.mockClear();
  charts.setSize.mockClear();
  charts.chart.mockReturnValue({ destroy: charts.destroy, setSize: charts.setSize });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("loads Company/site/year scoped aggregates and destroys its chart on unmount", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", async (path: string) => {
    paths.push(path);
    return Response.json(statistics);
  });
  const view = render(<InboxStatistics companyId="x" siteId="7" websites={[]} />);
  await screen.findByText("Shop · Semua status · UTC");
  await waitFor(() => expect(charts.chart).toHaveBeenCalled());
  expect(paths[0]).toContain("/api/companies/x/feedback/statistics?period=annual&year=");
  expect(paths[0]).toContain("siteId=7");
  const config = charts.chart.mock.calls[0][1];
  expect(config.series.map((series: { data: number[] }) => series.data)).toEqual([[2], [1], [0]]);
  expect(config.credits.enabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Tahun grafik"), { target: { value: "2025" } });
  await waitFor(() => expect(paths.some((path) => path.includes("year=2025"))).toBe(true));
  view.unmount();
  expect(charts.destroy).toHaveBeenCalled();
});

it("shows aggregate errors and retries without enabling export too soon", async () => {
  let fail = true;
  vi.stubGlobal("fetch", async () =>
    fail
      ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
      : Response.json(statistics),
  );
  render(<InboxStatistics companyId="x" websites={[]} />);
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Export Excel" }).hasAttribute("disabled")).toBe(true);
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi statistik" }));
  await screen.findByText("Shop · Semua status · UTC");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps aggregate numbers available if chart rendering fails", async () => {
  charts.chart.mockImplementation(() => {
    throw new Error("Chart failure");
  });
  vi.stubGlobal("fetch", async () =>
    Response.json({
      ...statistics,
      totals: { issues: 0, suggestions: 0, compliments: 0, total: 0 },
    }),
  );
  render(<InboxStatistics companyId="x" websites={[]} />);
  expect((await screen.findByRole("alert")).textContent).toContain("Rekap angka tetap tersedia");
  expect(screen.getByText(/Belum ada feedback pada tahun ini/)).toBeTruthy();
  expect(screen.getByText("Lihat rekap angka")).toBeTruthy();
});

it.each(["annual", "monthly", "all"])(
  "downloads %s aggregate export and closes the dialog",
  async (period) => {
    let exported = "";
    vi.stubGlobal("fetch", async (path: string) => {
      if (path.includes("/export?")) {
        exported = path;
        return new Response("workbook");
      }
      return Response.json(statistics);
    });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:workbook");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<InboxStatistics companyId="x" siteId="7" websites={[{ id: 7, name: "Shop" }]} />);
    await screen.findByText("Shop · Semua status · UTC");
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    fireEvent.change(screen.getByLabelText("Periode ekspor"), { target: { value: period } });
    if (period === "monthly") {
      fireEvent.change(screen.getByLabelText("Bulan ekspor"), { target: { value: "2" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Download Excel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(exported).toContain(`period=${period}`);
    expect(exported).toContain("siteId=7");
    if (period === "all") {
      expect(exported).not.toContain("year=");
    }
    if (period === "monthly") {
      expect(exported).toContain("month=2");
    }
  },
);

it("keeps export dialog open after failure and allows changing its website", async () => {
  let exported = "";
  vi.stubGlobal("fetch", async (path: string) => {
    if (path.includes("/export?")) {
      exported = path;
      return Response.json({ error: { message: "Export unavailable" } }, { status: 503 });
    }
    return Response.json(statistics);
  });
  render(<InboxStatistics companyId="x" websites={[{ id: 7, name: "Shop" }]} />);
  await screen.findByText("Shop · Semua status · UTC");
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.change(screen.getByLabelText("Website ekspor"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Download Excel" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Export unavailable");
  expect(exported).toContain("siteId=7");
  fireEvent.click(screen.getByRole("button", { name: "Batal" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
