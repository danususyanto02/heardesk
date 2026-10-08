import { Settings } from "@/components/settings";
import {Websites} from "@/components/websites";
import {legacyCompanyContext} from "@/server/company-context";
import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {createCompanyAccess} from "@/modules/companies/infrastructure/prisma-company-access";
export default async function SettingsPage({searchParams}:{searchParams:Promise<{company?:string}>}) {const actor=await requireActor();if(!await db.member.findFirst({where:{userId:actor.userId}}))return <Settings/>;const explicit=(await searchParams).company;const companyId=explicit??(await legacyCompanyContext()).companyId;await createCompanyAccess(db).read(actor,companyId,"sites:read",async()=>true);return <Websites companyId={companyId}/>;}
