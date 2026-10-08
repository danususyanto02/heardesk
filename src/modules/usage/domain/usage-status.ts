export function usageStatus(used:bigint,limit:bigint):{state:"normal"|"warning"|"limit"|"disabled";percent:number|null;label:string}{
 if(used<0n||limit<0n)throw new Error("Usage and limits cannot be negative.");
 if(limit===0n)return {state:"disabled",percent:null,label:"Tidak tersedia"};
 const state=used>=limit?"limit":used*100n>=limit*80n?"warning":"normal";
 return {state,percent:Number(used*10000n/limit)/100,label:state==="limit"?"Limit reached":state==="warning"?"Near limit":"Normal"};
}
