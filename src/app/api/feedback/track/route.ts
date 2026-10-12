import { z } from "zod";
import { db } from "@/server/db";
import { assertOrigin, failure, HttpError, json, readJson } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { trackedFeedback } from "@/modules/feedback/infrastructure/prisma-feedback-tracking";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await rateLimit("track:" + clientKey(request), 30);
    await rateLimit("track:global", 300);
    const input = z
      .object({ code: z.string().regex(/^[a-f0-9]{48}$/) })
      .strict()
      .parse(await readJson(request));
    const report = await trackedFeedback(db, input.code);
    if (!report) {
      throw new HttpError(404, "Feedback tidak ditemukan. Periksa kode pelacakan Anda.");
    }
    return json(report);
  } catch (error) {
    return failure(error);
  }
}
