import { requireAdmin } from "@/server/auth";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { rotateWidgetKey } from "@/server/site";
import { clientKey, rateLimit } from "@/server/rate-limit";
export async function POST(request: Request) {
  try {
    assertOrigin(request); await requireAdmin(request.headers);
    await rateLimit("key-rotation:" + clientKey(request), 5, 600);
    return json(await rotateWidgetKey(await readJson(request)));
  } catch (error) { return failure(error); }
}
