// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Settings } from "@/components/settings";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/components/feedback-form", () => ({ FeedbackForm: () => null }));
const site = {
  id: 7,
  companyId: "x",
  name: "Shop",
  origin: "https://shop.example.test",
  publicKey: "old-key",
  buttonLabel: "Report issue",
  position: "right",
};
beforeEach(() => {
  navigation.refresh.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("shows scoped installation code and saves edited settings", async () => {
  let written: unknown;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    if (options.method === "PATCH") {
      written = JSON.parse(options.body as string);
      return Response.json({ ...site, name: "Updated shop" });
    }
    return Response.json(site);
  });
  render(<Settings companyId="x" siteId={7} />);
  await screen.findByText(/data-site="old-key"/);
  fireEvent.change(screen.getByLabelText("Nama website"), { target: { value: "Updated shop" } });
  fireEvent.submit(screen.getByLabelText("Nama website").closest("form")!);
  await screen.findByText("Pengaturan tersimpan. Muat ulang website untuk melihat perubahan.");
  expect(written).toMatchObject({
    name: "Updated shop",
    origin: site.origin,
    buttonLabel: site.buttonLabel,
    position: "right",
  });
  expect(navigation.refresh).toHaveBeenCalled();
});

it("connects an unconfigured installation and immediately exposes its snippet", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    Response.json(
      options.method === "POST"
        ? { ...site, configured: true, appUrl: "https://feedback.example.test" }
        : { configured: false, appUrl: "https://feedback.example.test" },
    ),
  );
  render(<Settings />);
  const input = await screen.findByLabelText("Alamat website");
  fireEvent.change(input, { target: { value: site.origin } });
  fireEvent.click(screen.getByRole("button", { name: "Tambahkan website" }));
  await screen.findByText(/https:\/\/feedback.example.test\/widget.js/);
  expect(screen.getByText(/Website ditambahkan/)).toBeTruthy();
});

it("retries failed settings loading", async () => {
  let failed = true;
  vi.stubGlobal("fetch", async () =>
    failed
      ? Response.json({ error: { message: "Unavailable" } }, { status: 503 })
      : Response.json(site),
  );
  render(<Settings companyId="x" siteId={7} />);
  await screen.findByRole("alert");
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  await screen.findByLabelText("Nama website");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps edited settings when persistence fails", async () => {
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) =>
    options.method === "PATCH"
      ? Response.json({ error: { message: "Write denied" } }, { status: 403 })
      : Response.json(site),
  );
  render(<Settings companyId="x" siteId={7} />);
  const input = await screen.findByLabelText("Nama website");
  fireEvent.change(input, { target: { value: "Keep draft" } });
  fireEvent.submit(input.closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toBe("Write denied");
  expect((input as HTMLInputElement).value).toBe("Keep draft");
});

it("reports clipboard failure with manual recovery instructions", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("Denied");
      },
    },
  });
  vi.stubGlobal("fetch", async () => Response.json(site));
  render(<Settings companyId="x" siteId={7} />);
  fireEvent.click(await screen.findByRole("button", { name: "Salin kode" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("salin teks secara manual"),
  );
});

it("rotates only the expected key after confirmation and preserves pending settings", async () => {
  let written: unknown;
  vi.stubGlobal("fetch", async (path: string, options: RequestInit) => {
    if (path.endsWith("/key")) {
      written = JSON.parse(options.body as string);
      return Response.json({ ...site, publicKey: "new-key" });
    }
    return Response.json(site);
  });
  render(<Settings companyId="x" siteId={7} />);
  await screen.findByLabelText("Nama website");
  fireEvent.change(screen.getByLabelText("Nama website"), { target: { value: "Unsaved name" } });
  fireEvent.click(screen.getByRole("button", { name: "Perbarui kode pemasangan" }));
  fireEvent.click(screen.getByRole("button", { name: "Perbarui sekarang" }));
  await screen.findByText(/data-site="new-key"/);
  expect(written).toEqual({ confirm: true, expectedKey: "old-key" });
  expect((screen.getByLabelText("Nama website") as HTMLInputElement).value).toBe("Unsaved name");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("retains old installation code and offers recovery on rotation conflict", async () => {
  vi.stubGlobal("fetch", async (path: string) =>
    path.endsWith("/key")
      ? Response.json({ error: { message: "Key changed. Reload." } }, { status: 409 })
      : Response.json(site),
  );
  render(<Settings companyId="x" siteId={7} />);
  await screen.findByLabelText("Nama website");
  fireEvent.click(screen.getByRole("button", { name: "Perbarui kode pemasangan" }));
  fireEvent.click(screen.getByRole("button", { name: "Perbarui sekarang" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Key changed. Reload.");
  expect(screen.getByText(/data-site="old-key"/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Batal" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("copies exactly the current installation snippet", async () => {
  const clipboard: string[] = [];
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        clipboard.push(value);
      },
    },
  });
  vi.stubGlobal("fetch", async () => Response.json(site));
  render(<Settings companyId="x" siteId={7} />);
  fireEvent.click(await screen.findByRole("button", { name: "Salin kode" }));
  await screen.findByRole("button", { name: "Kode tersalin" });
  expect(clipboard).toEqual([
    `<script src="${location.origin}/widget.js" data-site="old-key" defer></script>`,
  ]);
});
