// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlatformCharts } from "@/components/platform-charts";
const charts = vi.hoisted(() => ({ chart: vi.fn(), destroy: vi.fn(), reflow: vi.fn() }));
vi.mock("highcharts", () => ({ default: { chart: charts.chart } }));
vi.mock("highcharts/modules/accessibility", () => ({}));
beforeEach(() => {
  charts.chart.mockReset();
  charts.destroy.mockClear();
  charts.chart.mockReturnValue({ destroy: charts.destroy, reflow: charts.reflow });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("renders daily then annual counts with UTC labels and real Company status totals", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", async (path: string) => {
    paths.push(path);
    return Response.json({
      years: [2025, 2026],
      points: [{ day: path.includes("annual") ? "2026-01" : "2026-10-01", count: 3 }],
    });
  });
  const view = render(<PlatformCharts active={4} suspended={1} />);
  await screen.findByText("2026-10-01: 3 reports");
  await waitFor(() => expect(charts.chart).toHaveBeenCalledTimes(2));
  expect(
    charts.chart.mock.calls[1][1].series[0].data.map((point: { y: number }) => point.y),
  ).toEqual([4, 1]);
  fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2" } });
  await waitFor(() => expect(paths.some((path) => path.includes("month=2"))).toBe(true));
  fireEvent.change(screen.getByLabelText("Period"), { target: { value: "annual" } });
  await screen.findByText("2026-01: 3 reports");
  expect(screen.queryByLabelText("Month")).toBeNull();
  fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2025" } });
  await waitFor(() => expect(paths.some((path) => path.includes("year=2025"))).toBe(true));
  view.unmount();
  expect(charts.destroy).toHaveBeenCalled();
});
it("retries an unavailable activity response", async () => {
  let failed = true;
  vi.stubGlobal("fetch", async () =>
    failed
      ? Response.json({}, { status: 503 })
      : Response.json({ years: [2026], points: [{ day: "2026-10-01", count: 0 }] }),
  );
  render(<PlatformCharts active={0} suspended={0} />);
  expect((await screen.findByRole("alert")).textContent).toContain("Activity could not be loaded");
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry activity" }));
  await screen.findByText("2026-10-01: 0 reports");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("retains Company summary if the chart library fails", async () => {
  charts.chart.mockImplementation(() => {
    throw new Error("Chart unavailable");
  });
  vi.stubGlobal("fetch", async () => Response.json({ years: [2026], points: [] }));
  render(<PlatformCharts active={4} suspended={1} />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Summary counts remain available",
  );
  expect(screen.getByText("4 active · 1 suspended")).toBeTruthy();
});
