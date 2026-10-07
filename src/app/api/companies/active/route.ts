import { cookies } from "next/headers";
import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { z } from "zod";
import { env } from "@/server/env";
export async function POST(request: Request) {
  try { assertOrigin(request); const { companyId } = z.object({ companyId: z.string().min(1).max(200) }).strict().parse(await readJson(request)); const { actor, services } = await companyApi(request, companyId); await services.listWebsites(actor, companyId);
    (await cookies()).set("heardesk-company", companyId, { httpOnly: true, sameSite: "lax", secure: env().APP_URL.startsWith("https:"), path: "/", maxAge: 43200 }); return json({ companyId });
  } catch (error) { return failure(error); }
}
