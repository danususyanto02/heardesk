// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PlatformCompanyEditor } from "@/components/platform-company";
import type { PlatformCompany } from "@/modules/platform/domain/platform-repository";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const initial: PlatformCompany = {
  id: "x",
  name: "Team X",
  status: "ACTIVE",
  reason: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-10T00:00:00Z",
  owners: [],
  members: 1,
  websites: 1,
  reports: 0,
  monthlyReports: 0,
  period: "2026-10",
  storedBytes: "0",
  limits: { websites: 3, seats: 5, monthlyReports: 1000, storageBytes: "1024" },
};

it("suspends and reactivates with audited reasons and server versions", async () => {
  const changes: { status: string; reason: string; expectedUpdatedAt: string }[] = [];
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    const payload = JSON.parse(options.body as string);
    changes.push(payload);
    return Response.json({
      ...initial,
      status: payload.status,
      reason: payload.reason,
      updatedAt: "2026-10-11T00:00:00Z",
    });
  });
  render(<PlatformCompanyEditor initial={initial} />);
  fireEvent.change(screen.getByLabelText("Reason for status change"), {
    target: { value: "Abuse investigation" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Suspend Company" }));
  await screen.findByText("Company status updated.");
  fireEvent.change(screen.getByLabelText("Reason for status change"), {
    target: { value: "Resolved" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reactivate Company" }));
  await screen.findByRole("button", { name: "Suspend Company" });
  expect(changes[0]).toMatchObject({ status: "SUSPENDED", expectedUpdatedAt: initial.updatedAt });
  expect(changes[1]).toMatchObject({
    status: "ACTIVE",
    reason: "Resolved",
    expectedUpdatedAt: "2026-10-11T00:00:00Z",
  });
});

it("saves edited allowances and clears only their reason", async () => {
  let written: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    written = JSON.parse(options.body as string);
    return Response.json({ ...initial, limits: { ...initial.limits, websites: 10 } });
  });
  render(<PlatformCompanyEditor initial={initial} />);
  fireEvent.change(screen.getByLabelText("Websites limit"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Storage limit (bytes)"), { target: { value: "2048" } });
  fireEvent.change(screen.getByLabelText("Reason for allowance change"), {
    target: { value: "Customer request" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save allowances" }));
  await screen.findByText("Company allowances updated.");
  expect(written).toMatchObject({
    action: "limits",
    websites: 10,
    storageBytes: "2048",
    reason: "Customer request",
    expectedUpdatedAt: initial.updatedAt,
  });
  expect((screen.getByLabelText("Reason for allowance change") as HTMLTextAreaElement).value).toBe(
    "",
  );
});

it("keeps optimistic-conflict drafts until explicitly reloading saved allowances", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    options.method
      ? Response.json({ error: { message: "Company changed" } }, { status: 409 })
      : Response.json({ ...initial, limits: { ...initial.limits, websites: 20 } }),
  );
  render(<PlatformCompanyEditor initial={initial} />);
  fireEvent.change(screen.getByLabelText("Websites limit"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Reason for allowance change"), {
    target: { value: "Requested" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save allowances" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Websites limit") as HTMLInputElement).value).toBe("10");
  fireEvent.click(screen.getByRole("button", { name: "Reload saved allowances" }));
  await screen.findByDisplayValue("20");
  expect(screen.queryByRole("alert")).toBeNull();
});
