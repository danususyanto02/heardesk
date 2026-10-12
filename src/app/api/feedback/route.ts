import { submitFeedback } from "@/server/feedback";
import { failure, json } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const result = await submitFeedback(request);
    return json(
      { success: true, ...("trackingCode" in result ? { trackingCode: result.trackingCode } : {}) },
      result.duplicate ? 200 : 201,
    );
  } catch (error) {
    return failure(error);
  }
}
