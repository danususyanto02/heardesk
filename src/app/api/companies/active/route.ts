import { cookies } from "next/headers";
import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { z } from "zod";
import { env } from "@/server/env";
import {db} from "@/server/db";
import {createCompanyAccess} from "@/modules/companies/infrastructure/prisma-company-access";
export async function POST(request: Request) {
  try { assertOrigin(request); const { companyId } = z.object({ companyId: z.string().min(1).max(200) }).strict().parse(await readJson(request)); const { actor } = await companyApi(request, companyId); await createCompanyAccess(db).read(actor,companyId,"company:read",async()=>true);
    (await cookies()).set("heardesk-company", companyId, { httpOnly: true, sameSite: "lax", secure: env().APP_URL.startsWith("https:"), path: "/", maxAge: 43200 }); return json({ companyId });
  } catch (error) { return failure(error); }
}
