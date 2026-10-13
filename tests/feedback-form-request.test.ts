import { expect, it } from "vitest";
import { readFeedbackForm } from "@/server/feedback-form-request";

function request(body: FormData) {
  return new Request("http://localhost/api/feedback", { method: "POST", body });
}

it("retains allowed fields and screenshot bytes without parsing bearer codes as feedback input", async () => {
  const body = new FormData();
  body.set("message", "Checkout broken");
  body.set("trackingCode", "a".repeat(48));
  body.set("screenshot", new File(["image-bytes"], "screenshot.png", { type: "image/png" }));
  const form = await readFeedbackForm(request(body));
  expect(form.get("message")).toBe("Checkout broken");
  expect(form.get("trackingCode")).toBe("a".repeat(48));
  expect(await (form.get("screenshot") as File).text()).toBe("image-bytes");
});

it("rejects unsupported content types and malformed multipart", async () => {
  await expect(
    readFeedbackForm(new Request("http://localhost/api/feedback", { method: "POST", body: "{}" })),
  ).rejects.toMatchObject({ status: 415 });
  await expect(
    readFeedbackForm(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=missing" },
        body: "invalid",
      }),
    ),
  ).rejects.toMatchObject({ status: 400 });
});

it("rejects duplicate fields and forged Company context", async () => {
  const duplicate = new FormData();
  duplicate.append("message", "first");
  duplicate.append("message", "second");
  await expect(readFeedbackForm(request(duplicate))).rejects.toMatchObject({ status: 400 });
  const unknown = new FormData();
  unknown.set("companyId", "foreign-company");
  await expect(readFeedbackForm(request(unknown))).rejects.toMatchObject({ status: 400 });
});

it("rejects declared oversized bodies before multipart parsing", async () => {
  await expect(
    readFeedbackForm(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=missing",
          "content-length": String(6 * 1024 * 1024 + 1),
        },
        body: "invalid",
      }),
    ),
  ).rejects.toMatchObject({ status: 413 });
});
