// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
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
