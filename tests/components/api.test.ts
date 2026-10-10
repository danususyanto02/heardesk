// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

it("uses the URL Company rather than a stale page preference for admin requests", async () => {
  history.replaceState(null, "", "/inbox?company=company-y");
  document.body.innerHTML = '<main data-company-id="company-x"></main>';
  let headers: HeadersInit | undefined;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    headers = options.headers;
    return Response.json({ items: [] });
  });
  expect(await api("/api/admin/feedback")).toEqual({ items: [] });
  expect(new Headers(headers).get("x-heardesk-company")).toBe("company-y");
});

it("does not send the admin scope header to public endpoints or force JSON on uploads", async () => {
  history.replaceState(null, "", "/inbox?company=company-y");
  let headers: HeadersInit | undefined;
  vi.stubGlobal("fetch", async (_path: string, options: RequestInit) => {
    headers = options.headers;
    return Response.json({ ok: true });
  });
  await api("/api/feedback", { method: "POST", body: new FormData() });
  expect(new Headers(headers).has("x-heardesk-company")).toBe(false);
  expect(new Headers(headers).has("content-type")).toBe(false);
});

it.each([
  [{ error: { message: "Denied" } }, "Denied"],
  [{ message: "Retry later" }, "Retry later"],
  [{}, "Permintaan gagal. Coba lagi."],
])("exposes the supported error envelope", async (body, message) => {
  vi.stubGlobal("fetch", async () => Response.json(body, { status: 403 }));
  await expect(api("/api/admin/feedback")).rejects.toThrow(message);
});
