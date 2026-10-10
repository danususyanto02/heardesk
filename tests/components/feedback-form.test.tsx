// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeedbackForm } from "@/components/feedback-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function fillMessage() {
  fireEvent.change(screen.getByLabelText(/Pesan/), { target: { value: "Checkout broken" } });
}
function send() {
  fireEvent.click(screen.getByRole("button", { name: "Kirim feedback" }));
}

it("never submits a preview", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(<FeedbackForm siteKey="key" name="Shop" preview />);
  fillMessage();
  send();
  expect(screen.getByRole("alert").textContent).toContain("Ini preview");
  expect(fetch).not.toHaveBeenCalled();
});

it("focuses an empty message and invalid optional email before sending", () => {
  render(<FeedbackForm siteKey="key" name="Shop" />);
  send();
  expect(document.activeElement).toBe(screen.getByLabelText(/Pesan/));
  fillMessage();
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid" } });
  send();
  expect(screen.getByRole("alert").textContent).toContain("alamat email");
  expect(document.activeElement).toBe(screen.getByLabelText("Email"));
});

it("retries unchanged submissions with the same idempotency key and omits credentials", async () => {
  const submissions: FormData[] = [];
  vi.stubGlobal("fetch", async (path: string, options: RequestInit) => {
    expect(path).toBe("/api/feedback");
    expect(options.credentials).toBe("omit");
    submissions.push(options.body as FormData);
    return submissions.length === 1
      ? Response.json({ error: { message: "Try again" } }, { status: 503 })
      : Response.json({ duplicate: false });
  });
  render(<FeedbackForm siteKey="key" name="Shop" />);
  fillMessage();
  send();
  await screen.findByRole("alert");
  send();
  await screen.findByRole("heading", { name: "Feedback sudah diterima" });
  expect(submissions[0].get("submissionId")).toBe(submissions[1].get("submissionId"));
  expect(submissions[0].get("siteKey")).toBe("key");
  fireEvent.click(screen.getByRole("button", { name: "Kirim masukan lain" }));
  expect((screen.getByLabelText(/Pesan/) as HTMLTextAreaElement).value).toBe("");
  fillMessage();
  send();
  await screen.findByRole("heading", { name: "Feedback sudah diterima" });
  expect(submissions[2].get("submissionId")).not.toBe(submissions[1].get("submissionId"));
});

it("changes submission identity after edits and sends selected feedback type and screenshot", async () => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:feedback-preview");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const submissions: FormData[] = [];
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    submissions.push(options.body as FormData);
    return Response.json({ error: { message: "Try again" } }, { status: 503 });
  });
  render(<FeedbackForm siteKey="key" name="Shop" />);
  fillMessage();
  send();
  await screen.findByRole("alert");
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
  const radios = screen.getAllByRole("radio");
  fireEvent.click(radios[1]);
  fireEvent.change(screen.getByLabelText(/Screenshot/), {
    target: { files: [new File(["image"], "small.png", { type: "image/png" })] },
  });
  await screen.findByAltText("Preview screenshot pilihan Anda");
  send();
  await screen.findByRole("alert");
  expect(submissions[1].get("submissionId")).not.toBe(submissions[0].get("submissionId"));
  expect(submissions[1].get("type")).toBe("SUGGESTION");
  expect(submissions[1].get("screenshot")).toBeInstanceOf(File);
  fireEvent.click(screen.getByRole("button", { name: "Hapus screenshot" }));
  expect(screen.queryByAltText("Preview screenshot pilihan Anda")).toBeNull();
});

it("rejects unsupported screenshots without a preview", () => {
  render(<FeedbackForm siteKey="key" name="Shop" />);
  fireEvent.change(screen.getByLabelText(/Screenshot/), {
    target: { files: [new File(["text"], "text.txt", { type: "text/plain" })] },
  });
  expect(screen.getByRole("alert").textContent).toContain("maksimal 5 MiB");
});
