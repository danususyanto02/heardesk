import { bootstrap } from "@/server/setup";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { clientKey, rateLimit } from "@/server/rate-limit";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await rateLimit("setup:" + clientKey(request), 5, 600);
    await rateLimit("setup:global", 10, 600);
    return json(await bootstrap(await readJson(request)), 201);
  } catch (error) {
    return failure(error);
  }
}
