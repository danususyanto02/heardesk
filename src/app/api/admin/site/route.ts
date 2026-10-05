import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { assertOrigin, failure, HttpError, json, readJson } from "@/server/http";
import { siteInput } from "@/lib/validation";
import { env } from "@/server/env";
import { connectSite } from "@/server/site";
export async function GET(request: Request) { try { await requireAdmin(request.headers); const site = await db.site.findUnique({ where: { id: 1 } }); return json({ ...site, configured: !!site, appUrl: new URL(env().APP_URL).origin }); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { assertOrigin(request); await requireAdmin(request.headers); return json({ ...await connectSite(await readJson(request)), configured: true, appUrl: new URL(env().APP_URL).origin }, 201); } catch (error) { return failure(error); } }
export async function PATCH(request: Request) { try { assertOrigin(request); await requireAdmin(request.headers); if (!await db.site.findUnique({ where: { id: 1 } })) throw new HttpError(409, "Hubungkan website terlebih dahulu."); return json(await db.site.update({ where: { id: 1 }, data: siteInput.parse(await readJson(request)) })); } catch (error) { return failure(error); } }
