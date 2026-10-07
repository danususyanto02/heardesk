import { assertOrigin, failure, json, readJson } from "@/server/http";
import { env } from "@/server/env";
import { connectSite, defaultSite, updateSite } from "@/server/site";
export async function GET(request: Request) { try { const site = await defaultSite(request.headers); return json({ ...site, configured: !!site, appUrl: new URL(env().APP_URL).origin }); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { assertOrigin(request); return json({ ...await connectSite(await readJson(request), request.headers), configured: true, appUrl: new URL(env().APP_URL).origin }, 201); } catch (error) { return failure(error); } }
export async function PATCH(request: Request) { try { assertOrigin(request); return json(await updateSite(await readJson(request), request.headers)); } catch (error) { return failure(error); } }
