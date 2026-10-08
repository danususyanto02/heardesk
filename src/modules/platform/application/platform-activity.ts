import type {SessionReader} from "../../identity/domain/session";
import type {Clock} from "../../usage/domain/usage";
import {requirePlatformOwner} from "../../identity/application/require-platform-owner";
import type {ActivityReader} from "../domain/activity";
export type ActivityPeriod={period:"monthly"|"annual";year:number;month?:number};
export function platformActivity(reader:ActivityReader,session:SessionReader,clock:Clock){return async(input:ActivityPeriod|number)=>{
 const actor=await requirePlatformOwner(session),now=clock.now();let start:Date,end:Date,daily:boolean;
 if(typeof input==="number"){
  if(![7,30,90].includes(input))throw Object.assign(new Error("Invalid date range"),{code:"PLATFORM_INPUT_INVALID"});
  end=new Date(now);end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()+1);start=new Date(end);start.setUTCDate(start.getUTCDate()-input);daily=true;
 }else{
  if(!["monthly","annual"].includes(input.period)||!Number.isInteger(input.year)||input.year<1900||input.year>9998||input.period==="monthly"&&(!Number.isInteger(input.month)||input.month!<1||input.month!>12))throw Object.assign(new Error("Invalid reporting period"),{code:"PLATFORM_INPUT_INVALID"});
  daily=input.period==="monthly";start=new Date(Date.UTC(input.year,daily?input.month!-1:0,1));end=new Date(Date.UTC(input.year,daily?input.month!:12,1));
 }
 const data=new Map<string,number>();for(const row of await reader.counts(actor.userId,start,end)){const key=row.day.slice(0,daily?10:7);data.set(key,(data.get(key)??0)+row.count);}
 const points:{day:string;count:number}[]=[];for(const date=new Date(start);date<end;daily?date.setUTCDate(date.getUTCDate()+1):date.setUTCMonth(date.getUTCMonth()+1)){const day=date.toISOString().slice(0,daily?10:7);points.push({day,count:data.get(day)??0});}
 const years=[...new Set([now.getUTCFullYear(),...(reader.years?await reader.years(actor.userId):[])])].sort((a,b)=>b-a);
 return {points,years};
};}
