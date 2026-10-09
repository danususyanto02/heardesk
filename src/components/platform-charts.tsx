"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { ChartSkeleton } from "./skeleton";
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function PlatformCharts({
  active,
  suspended,
}: Readonly<{ active: number; suspended: number }>) {
  const currentYear = new Date().getUTCFullYear();
  const [period, setPeriod] = useState("monthly");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [years, setYears] = useState<number[]>([currentYear]);
  const [points, setPoints] = useState<{ day: string; count: number }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  const reports = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setReady(false);
    setPoints([]);
    setError("");
    const query = new URLSearchParams({ period, year: String(year) });
    if (period === "monthly") {
      query.set("month", String(month));
    }
    api<{ points: { day: string; count: number }[]; years: number[] }>(
      `/api/platform/activity?${query}`,
    )
      .then((data) => {
        if (current) {
          setPoints(data.points);
          setYears(data.years);
        }
      })
      .catch(() => {
        if (current) {
          setError("Activity could not be loaded. Retry the request.");
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
  }, [period, year, month, retry]);
  useEffect(() => {
    let alive = true;
    setReady(false);
    let observer: ResizeObserver | undefined;
    let first: { destroy(): void; reflow(): void } | undefined;
    let second: { destroy(): void; reflow(): void } | undefined;
    async function draw() {
      if (loading || error) {
        return;
      }
      const Highcharts = (await import("highcharts")).default;
      await import("highcharts/modules/accessibility");
      if (!alive || !reports.current || !status.current) {
        return;
      }
      const styles = getComputedStyle(document.documentElement);
      const color = styles.getPropertyValue("--blue").trim();
      first = Highcharts.chart(reports.current, {
        chart: {
          type: "column",
          height: 240,
          animation: false,
          style: { fontFamily: "Source Sans 3" },
        },
        title: { text: undefined },
        credits: { enabled: true },
        xAxis: {
          categories: points.map((point) =>
            period === "monthly" ? point.day.slice(8) : months[Number(point.day.slice(5)) - 1],
          ),
          tickInterval: period === "monthly" ? Math.max(1, Math.ceil(points.length / 10)) : 1,
        },
        yAxis: { title: { text: "Reports" }, allowDecimals: false, min: 0 },
        legend: { enabled: false },
        plotOptions: { series: { animation: false } },
        series: [
          { type: "column", name: "Reports", data: points.map((point) => point.count), color },
        ],
        accessibility: {
          description:
            period === "monthly"
              ? `Reports received each day in ${months[month - 1]} ${year}, UTC.`
              : `Reports received each month of ${year}, UTC.`,
        },
      });
      second = Highcharts.chart(status.current, {
        chart: {
          type: "bar",
          height: 240,
          animation: false,
          style: { fontFamily: "Source Sans 3" },
        },
        title: { text: undefined },
        credits: { enabled: true },
        xAxis: { categories: ["Active", "Suspended"] },
        yAxis: { title: { text: undefined }, allowDecimals: false, min: 0 },
        legend: { enabled: false },
        plotOptions: { series: { animation: false } },
        series: [
          {
            type: "bar",
            name: "Companies",
            data: [
              { y: active, color },
              { y: suspended, color: styles.getPropertyValue("--muted").trim() },
            ],
          },
        ],
      });
      observer = new ResizeObserver(() => {
        first?.reflow();
        second?.reflow();
      });
      observer.observe(reports.current);
      observer.observe(status.current);
      if (alive) {
        setReady(true);
      }
    }
    void draw().catch(() => {
      if (alive) {
        setError("Charts unavailable. Summary counts remain available.");
      }
    });
    return () => {
      alive = false;
      observer?.disconnect();
      first?.destroy();
      second?.destroy();
    };
  }, [points, loading, error, period, year, month, active, suspended]);
  const pending = !error && (loading || !ready);
  return (
    <div className="overview-charts">
      <section className="platform-panel platform-chart">
        <header className="calendar-chart-header">
          <div>
            <h2>Reports received</h2>
            <p className="helper">
              {period === "monthly"
                ? `${months[month - 1]} ${year} · Daily counts`
                : `${year} · Monthly counts`}{" "}
              · UTC
            </p>
          </div>
          <div className="calendar-chart-controls">
            <label>
              Period
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </label>
            {period === "monthly" && (
              <label>
                Month
                <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {months.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Year
              <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {[...new Set([year, ...years])]
                  .sort((a, b) => b - a)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </header>
        {error && (
          <div>
            <p role="alert" className="error">
              {error}
            </p>
            <button className="btn" onClick={() => setRetry((value) => value + 1)}>
              Retry activity
            </button>
          </div>
        )}
        <div className="chart-loading-stage" style={{ minHeight: 240 }}>
          {pending && (
            <div className="chart-skeleton-overlay">
              <ChartSkeleton label="Loading report activity" height={240} />
            </div>
          )}
          <div
            ref={reports}
            style={{ visibility: ready ? "visible" : "hidden" }}
            aria-hidden={!ready}
            aria-busy={pending}
          />
        </div>
        <details>
          <summary>View activity data (UTC)</summary>
          <ul>
            {points.map((point) => (
              <li key={point.day}>
                {point.day}: {point.count} reports
              </li>
            ))}
          </ul>
        </details>
      </section>
      <section className="platform-panel platform-chart">
        <h2>Company status</h2>
        <div className="chart-loading-stage" style={{ minHeight: 240 }}>
          {pending && (
            <div className="chart-skeleton-overlay">
              <ChartSkeleton label="Loading Company status chart" height={240} />
            </div>
          )}
          <div
            ref={status}
            style={{ visibility: ready ? "visible" : "hidden" }}
            aria-hidden={!ready}
            aria-busy={pending}
          />
        </div>
        <p className="helper">
          {active} active · {suspended} suspended
        </p>
      </section>
    </div>
  );
}
