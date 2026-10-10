// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoForm } from "@/components/demo-form";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("requires a message and focuses the invalid field", () => {
  render(<DemoForm close={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Kirim simulasi" }));
  expect(screen.getByRole("alert").textContent).toBe("Pesan wajib diisi.");
  expect(document.activeElement).toBe(screen.getByLabelText(/Pesan/));
});

it("validates optional email, then completes without a network request", () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Demo must stay local"));
  render(<DemoForm close={() => {}} />);
  fireEvent.change(screen.getByLabelText(/Pesan/), { target: { value: "Helpful feedback" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "invalid" } });
  fireEvent.click(screen.getByRole("button", { name: "Kirim simulasi" }));
  expect(screen.getByRole("alert").textContent).toContain("alamat email");
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Kirim simulasi" }));
  expect(screen.getByRole("heading", { name: "Simulasi selesai" })).toBe(document.activeElement);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  expect((screen.getByLabelText(/Pesan/) as HTMLTextAreaElement).value).toBe("Helpful feedback");
});

it("rejects unsupported and oversized screenshots", () => {
  render(<DemoForm close={() => {}} />);
  const input = screen.getByLabelText(/Screenshot/);
  for (const file of [
    new File(["text"], "text.txt", { type: "text/plain" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
  ]) {
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByRole("alert").textContent).toContain("maksimal 5 MiB");
    expect(screen.queryByAltText("Preview screenshot pilihan Anda")).toBeNull();
  }
});

it("previews and releases a selected screenshot", async () => {
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:demo-preview");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  render(<DemoForm close={() => {}} />);
  const file = new File(["image"], "small.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText(/Screenshot/), { target: { files: [file] } });
  expect((await screen.findByAltText("Preview screenshot pilihan Anda")).getAttribute("src")).toBe(
    "blob:demo-preview",
  );
  expect(create).toHaveBeenCalledWith(file);
  fireEvent.click(screen.getByRole("button", { name: "Hapus screenshot" }));
  expect(screen.queryByAltText("Preview screenshot pilihan Anda")).toBeNull();
  expect(revoke).toHaveBeenCalledWith("blob:demo-preview");
});
