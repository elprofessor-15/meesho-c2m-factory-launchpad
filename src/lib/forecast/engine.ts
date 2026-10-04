import {Observation,Product} from '../types';
export type Inputs=Product&{exposure?:number;horizon?:number;seed?:number;priorStrength?:number};
const quant=(a:number[],q:number)=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor((b.length-1)*q)]??0;};
function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function forecast(p:Inputs,observations:Observation[]){
 const eligible=observations.filter(o=>o.day<0&&o.available&&o.category===p.category&&Math.abs(o.price/p.price-1)<=.25&&o.age<=Math.max(30,p.age+15));
 const own=observations.filter(o=>o.sku===p.id&&o.day<0&&o.day>=-p.age&&o.available&&Math.abs(o.price/p.price-1)<=.25);const comparable=eligible.filter(o=>o.sku!==p.id);
 const missing=['cost','packaging','forward','reverse','fees'].filter(k=>p[k as keyof Product]===null);
 const base={missing,comparableProducts:new Set(comparable.map(o=>o.sku)).size,eligibleDays:eligible.length,ownDays:own.length};
 if(comparable.length<14||!comparable.reduce((s,o)=>s+o.visits,0))return{...base,status:'insufficient' as const,reason:'Insufficient comparable observations in this price band and launch stage.'};
 const visits=comparable.reduce((s,o)=>s+o.visits,0), purchases=comparable.reduce((s,o)=>s+o.purchases,0),units=comparable.reduce((s,o)=>s+o.units,0);
 const prior=p.priorStrength??500,ownVisits=own.reduce((s,o)=>s+o.visits,0),ownPurchases=own.reduce((s,o)=>s+o.purchases,0);
 const conversion=(purchases/visits*prior+ownPurchases)/(prior+ownVisits);const unitsPerPurchase=units/Math.max(1,purchases);
 const random=rng(p.seed??4217),exposure=p.exposure??120;const horizon=30;
 const trajectories:number[][]=[];const cumulative:number[][]=[];const fulfilled:number[]=[];
 for(let run=0;run<400;run++){const daily:number[]=[],cum:number[]=[];let total=0,stock=Math.max(0,p.stock-p.reserved),fulfil=0;const conv=Math.max(.001,conversion+(random()-.5)*2*Math.sqrt(conversion*(1-conversion)/(prior+ownVisits))*1.64);const exposureFactor=.7+random()*.6;let produced=0;
  for(let d=1;d<=horizon;d++){const n=Math.max(0,Math.round(exposure*exposureFactor*conv*unitsPerPurchase*(.6+random()*.8)));daily.push(n);total+=n;cum.push(total);if(d===p.arrival)stock+=p.inbound;
   if(d>=p.lead&&(d-p.lead)%7===0){const target=Math.max(0,Math.ceil(exposure*conv*unitsPerPurchase*7-stock));const safe=Math.min(p.capacity,Math.floor(Math.max(0,p.cash-produced*(p.cost??0))/Math.max(1,p.cost??1)));const batch=Math.floor(Math.min(target,safe)/p.batch)*p.batch;stock+=batch;produced+=batch;}
   const f=Math.min(n,stock,p.dispatch);stock-=f;if(d<=(p.horizon??7))fulfil+=f;
  }trajectories.push(daily);cumulative.push(cum);fulfilled.push(fulfil);
 }
 const series=Array.from({length:30},(_,i)=>({day:i+1,p10:quant(trajectories.map(t=>t[i]),.1),p50:quant(trajectories.map(t=>t[i]),.5),p90:quant(trajectories.map(t=>t[i]),.9),c10:quant(cumulative.map(t=>t[i]),.1),c50:quant(cumulative.map(t=>t[i]),.5),c90:quant(cumulative.map(t=>t[i]),.9)}));
 const index=(p.horizon??7)-1,ordered=series[index].c50,fulfilledUnits=quant(fulfilled,.5);const shipped=fulfilledUnits*.97,delivered=shipped*.91,retained=delivered*.94;
 const nmv=Math.round(retained*p.price);const cost=p.cost??0;const costBreakdown={production:Math.round(fulfilledUnits*cost-((shipped-delivered)+(delivered-retained))*cost*p.recoverable),packaging:Math.round(fulfilledUnits*(p.packaging??0)),forward:Math.round(shipped*(p.forward??0)),reverse:Math.round((shipped-retained)*(p.reverse??0)),fees:Math.round(retained*(p.fees??0))};
 const contribution=missing.length?null:nmv-Object.values(costBreakdown).reduce((a,b)=>a+b,0);
 const protection=Math.min(29,p.lead+7-1),target=series[protection].c90;const position=Math.max(0,p.stock-p.reserved)+(p.arrival<=p.lead+7?p.inbound:0);const need=Math.max(0,target-position);const cap=Math.min(p.capacity,Math.floor(p.cash/Math.max(1,cost)));const safe=Math.min(need,cap);const recommended=Math.floor(safe/p.batch)*p.batch;const batchConflict=safe>0&&safe<p.batch;
 const constraints:string[]=[];if(ordered>fulfilledUnits)constraints.push('Stock or dispatch capacity limits fulfilment');if(batchConflict)constraints.push('Minimum batch exceeds safe stock recommendation');if(missing.length)constraints.push('Missing costs: '+missing.join(', '));if(contribution!==null&&contribution/Math.max(1,retained)<p.floor)constraints.push('Contribution below manufacturer floor');if(exposure<60)constraints.push('Low exposure: check listing eligibility and discovery');if(conversion<.025)constraints.push('Weak conversion: review content, relevance and price position');
 return{...base,status:'ready' as const,series,conversion,ownWeight:ownVisits/(ownVisits+prior),exposure,unitsPerPurchase,ordered,fulfilled:fulfilledUnits,retained:Math.round(retained),nmv,contribution,costBreakdown,recommended,unmet:Math.max(0,ordered-fulfilledUnits),batchConflict,constraints,range:[series[index].c10,series[index].c90],seven:series[6],thirty:series[29]};
}
