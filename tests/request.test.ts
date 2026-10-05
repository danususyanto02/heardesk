import { it, expect } from "vitest";
import { boundedBytes, HttpError } from "../src/server/http";
it("limits chunked bodies without Content-Length", async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); controller.close(); } });
  const request = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
  await expect(boundedBytes(request, 10)).rejects.toBeInstanceOf(HttpError);
});
it("returns bounded body bytes", async () => {
  const bytes = await boundedBytes(new Request("http://localhost", { method: "POST", body: "abc" }), 10);
  expect(bytes.toString()).toBe("abc");
});
