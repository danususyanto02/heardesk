import {companyApi} from "@/server/company-api";
import {db} from "@/server/db";
import {createFeedbackStatistics} from "@/server/composition/feedback-statistics";
import {statisticsQuery} from "@/server/statistics-query";
import {failure,json} from "@/server/http";
export async function GET(request:Request,{params}:{params:Promise<{companyId:string}>}){try{const {companyId}=await params,{actor}=await companyApi(request,companyId);const input=statisticsQuery.parse(Object.fromEntries(new URL(request.url).searchParams));return json(await createFeedbackStatistics(db).report(actor,companyId,input));}catch(error){return failure(error);}}
