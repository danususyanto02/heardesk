import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {failure,json} from "@/server/http";
import {platformActivity} from "@/modules/platform/application/platform-activity";
import {prismaActivity} from "@/modules/platform/infrastructure/prisma-activity";
import {z} from "zod";
export async function GET(request:Request){try{const params=new URL(request.url).searchParams;const run=platformActivity(prismaActivity(db),{current:()=>requireActor(request.headers)},{now:()=>new Date()});
 if(params.has("days"))return json(await run(z.coerce.number().refine(value=>[7,30,90].includes(value)).parse(params.get("days"))));
 const input=z.object({period:z.enum(["monthly","annual"]).default("monthly"),year:z.coerce.number().int().min(1900).max(9998).default(new Date().getUTCFullYear()),month:z.coerce.number().int().min(1).max(12).optional()}).parse(Object.fromEntries(params));
 return json(await run({...input,month:input.period==="monthly"?input.month??new Date().getUTCMonth()+1:undefined}));
}catch(error){return failure(error);}}
