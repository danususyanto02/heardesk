import {companyApi} from "@/server/company-api";
import {db} from "@/server/db";
import {createFeedbackStatistics} from "@/server/composition/feedback-statistics";
import {statisticsQuery} from "@/server/statistics-query";
import {feedbackWorkbook} from "@/modules/feedback/infrastructure/feedback-excel";
import {failure,HttpError,privateHeaders} from "@/server/http";
import {rateLimit} from "@/server/rate-limit";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{companyId:string}>}){try{const {companyId}=await params,{actor}=await companyApi(request,companyId);await rateLimit("feedback-export:"+actor.userId,10,60);const input=statisticsQuery.parse(Object.fromEntries(new URL(request.url).searchParams));const report=await createFeedbackStatistics(db).report(actor,companyId,input);if(!report.totals.total)throw new HttpError(422,"Tidak ada feedback pada periode ini.","EXPORT_EMPTY");const bytes=await feedbackWorkbook(report);return new Response(new Uint8Array(bytes),{headers:{...privateHeaders,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":`attachment; filename="heardesk-feedback-${input.period}-${input.year??"all"}${input.month?"-"+String(input.month).padStart(2,"0"):""}.xlsx"`}});}catch(error){return failure(error);}}
