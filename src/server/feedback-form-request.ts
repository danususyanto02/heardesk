import { boundedBytes, HttpError } from "./http";

export const feedbackFormFields = [
  "siteKey",
  "submissionId",
  "type",
  "message",
  "email",
  "pageUrl",
  "screenshot",
  "trackingCode",
];

export async function readFeedbackForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data;")) {
    throw new HttpError(415, "Gunakan formulir feedback.");
  }
  const bytes = await boundedBytes(request, 6 * 1024 * 1024);
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: bytes,
    }).formData();
  } catch {
    throw new HttpError(400, "Formulir tidak valid.");
  }
  for (const key of form.keys()) {
    if (!feedbackFormFields.includes(key) || form.getAll(key).length !== 1) {
      throw new HttpError(400, "Field formulir tidak valid.");
    }
  }
  return form;
}
