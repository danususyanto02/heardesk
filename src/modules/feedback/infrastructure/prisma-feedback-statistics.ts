import type {PrismaClient} from "@/generated/prisma/client";
import {Prisma} from "@/generated/prisma/client";
import {createCompanyAccess} from "../../companies/infrastructure/prisma-company-access";
import {CompanyAccessError} from "../../companies/domain/access";
import type {FeedbackStatisticsReader,StatisticsRow} from "../domain/statistics";

export function prismaFeedbackStatistics(db:PrismaClient):FeedbackStatisticsReader{return {read:(actor,companyId,input,now)=>createCompanyAccess(db).read(actor,companyId,"feedback:read",async(scope,tx)=>{
  const company=await tx.organization.findUniqueOrThrow({where:{id:scope.companyId},select:{name:true}});
  const website=input.siteId?await tx.site.findFirst({where:{id:input.siteId,companyId:scope.companyId},select:{name:true}}):null;
  if(input.siteId&&!website)throw new CompanyAccessError("RESOURCE_NOT_FOUND");
  const site= input.siteId?Prisma.sql`AND f."siteId"=${input.siteId}`:Prisma.empty;
  const yearsData=await tx.$queryRaw<{year:number;first:Date}[]>(Prisma.sql`SELECT EXTRACT(YEAR FROM f."createdAt")::int AS year,MIN(f."createdAt") AS first FROM "Feedback" f JOIN "Site" s ON s.id=f."siteId" WHERE s."companyId"=${scope.companyId} ${site} GROUP BY 1 ORDER BY 1 DESC`);
  const years=[...new Set([now.getUTCFullYear(),...yearsData.map(row=>row.year)])].sort((a,b)=>b-a);
  let start:Date,end:Date;
  if(input.period==="all"){
    const first=yearsData.reduce<Date|null>((value,row)=>!value||row.first<value?row.first:value,null);
    start=first?new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),1)):new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
    end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
    if(start>=end)start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  }else{start=new Date(Date.UTC(input.year!,input.period==="monthly"?input.month!-1:0,1));end=new Date(Date.UTC(input.year!,input.period==="monthly"?input.month!:12,1));}
  const pattern=input.period==="monthly"?"YYYY-MM-DD":"YYYY-MM";
  const grouped=await tx.$queryRaw<{label:string;type:string;count:bigint}[]>(Prisma.sql`SELECT to_char(f."createdAt",${pattern}) AS label,f.type::text AS type,count(*) AS count FROM "Feedback" f JOIN "Site" s ON s.id=f."siteId" WHERE s."companyId"=${scope.companyId} ${site} AND f."createdAt">=${start} AND f."createdAt"<${end} GROUP BY 1,2 ORDER BY 1`);
  const values=new Map(grouped.map(row=>[row.label+":"+row.type,Number(row.count)]));
  const rows:StatisticsRow[]=[];
  for(const date=new Date(start);date<end;input.period==="monthly"?date.setUTCDate(date.getUTCDate()+1):date.setUTCMonth(date.getUTCMonth()+1)){
    const label=date.toISOString().slice(0,input.period==="monthly"?10:7),issues=values.get(label+":ISSUE")??0,suggestions=values.get(label+":SUGGESTION")??0,compliments=values.get(label+":COMPLIMENT")??0;
    rows.push({label,issues,suggestions,compliments,total:issues+suggestions+compliments});
    if(rows.length>100000)throw new Error("Reporting range exceeds supported calendar bounds.");
  }
  const totals=rows.reduce((sum,row)=>({issues:sum.issues+row.issues,suggestions:sum.suggestions+row.suggestions,compliments:sum.compliments+row.compliments,total:sum.total+row.total}),{issues:0,suggestions:0,compliments:0,total:0});
  return {companyName:company.name,websiteName:website?.name??"All websites",period:input.period,year:input.year,month:input.month,years,generatedAt:now.toISOString(),rows,totals};
})};}
