// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PublicReplies } from "@/components/public-replies";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("retains body and request identity on retry and publishes only once", async () => {
  const requests: { body: string; requestId: string }[] = [];
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    requests.push(JSON.parse(options.body as string));
    return requests.length === 1
      ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
      : Response.json({ id: "reply", body: "We are investigating.", createdAt: "2026-10-10" });
  });
  render(<PublicReplies id="report" initial={[]} enabled canReply />);
  fireEvent.change(screen.getByLabelText("Balasan publik"), {
    target: { value: "We are investigating." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Kirim balasan ke pelapor" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Balasan publik") as HTMLTextAreaElement).value).toBe(
    "We are investigating.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Kirim balasan ke pelapor" }));
  await screen.findByText("We are investigating.");
  expect(requests[0]).toEqual(requests[1]);
  expect((screen.getByLabelText("Balasan publik") as HTMLTextAreaElement).value).toBe("");
});
it("viewer can read replies without a public reply composer", () => {
  render(
    <PublicReplies
      id="report"
      initial={[{ id: "reply", body: "Published response", createdAt: "2026-10-10" }]}
      enabled
      canReply={false}
    />,
  );
  expect(screen.getByText("Published response")).toBeTruthy();
  expect(screen.queryByLabelText("Balasan publik")).toBeNull();
});
