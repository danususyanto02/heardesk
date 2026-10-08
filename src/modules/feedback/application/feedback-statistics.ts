import type {Actor} from "../../identity/domain/session";
import type {Clock} from "../../usage/domain/usage";
import type {FeedbackStatisticsReader,StatisticsInput} from "../domain/statistics";
export function feedbackStatistics(reader:FeedbackStatisticsReader,clock:Clock){return {report(actor:Actor,companyId:string,input:StatisticsInput){
  if(!["monthly","annual","all"].includes(input.period)||input.period!=="all"&&(!Number.isInteger(input.year)||input.year!<1900||input.year!>9998)||input.period==="monthly"&&(!Number.isInteger(input.month)||input.month!<1||input.month!>12)||input.siteId!==undefined&&(!Number.isInteger(input.siteId)||input.siteId<1))throw Object.assign(new Error("Invalid reporting period"),{code:"STATISTICS_INPUT_INVALID"});
  return reader.read(actor,companyId,input,clock.now());
}};}
