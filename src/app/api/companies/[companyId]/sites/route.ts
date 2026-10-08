import { companyApi } from "@/server/company-api";
import { assertOrigin, failure, json, readJson } from "@/server/http";
import { siteInput } from "@/lib/validation";
import {db} from "@/server/db";
import {createCompanyAccess} from "@/modules/companies/infrastructure/prisma-company-access";
import {pagination} from "@/modules/shared/domain/pagination";
import {z} from "zod";
type Context = { params: Promise<{ companyId: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const { companyId } = await params, { actor } = await companyApi(request, companyId);const query=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().refine(value=>[10,25,50,100].includes(value)).default(25)}).parse(Object.fromEntries(new URL(request.url).searchParams));return json(await createCompanyAccess(db).read(actor,companyId,"sites:read",async(scope,tx)=>{const total=await tx.site.count({where:{companyId:scope.companyId}}),{page,pageSize,take,skip}=pagination(total,query.page,query.pageSize);const items=await tx.site.findMany({where:{companyId:scope.companyId},select:{id:true,companyId:true,name:true,origin:true,publicKey:true,buttonLabel:true,position:true},orderBy:{id:"asc"},take,skip});const limits=await tx.companyLimits.findUniqueOrThrow({where:{companyId}});return {items,total,page,pageSize,websiteLimit:limits.websiteLimit};})); } catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { assertOrigin(request); const { companyId } = await params, { actor, services } = await companyApi(request, companyId), input = siteInput.parse(await readJson(request)); return json(await services.createWebsite(actor, companyId, input), 201); } catch (error) { return failure(error); }
}
