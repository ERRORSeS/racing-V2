import { seed } from './random.js';
import { clamp } from './rules.js';
const draw=key=>seed(key)/4294967296;
export function initializeForm(w,h){
 if(h.reliability)return;
 const n=draw(`${w.seed}:${h.id}:consistency`),base=clamp(62+draw(`${h.id}:reliability`)*33-(n<.035?55:0),10,98);
 h.reliability={version:4,baseConsistency:base,dailyVolatility:.015+(100-base)*.0012,currentForm:0,formMemory:0,lastFormUpdateDay:w.day,recentRaceOutputs:[],observedConfidence:0,origin:'Persisted simulation tendency; public estimate requires multiple comparable runs'};
}
export function updateForm(w,h){
 initializeForm(w,h);const p=h.reliability;
 if(w.day<=p.lastFormUpdateDay)return;
 // Weekly noise on a horse-specific stream: independent of click order and unrelated world RNG.
 const previousWeek=Math.floor(p.lastFormUpdateDay/7),week=Math.floor(w.day/7);
 for(let k=previousWeek+1;k<=week;k++)p.currentForm=clamp(p.currentForm*.88+(draw(`${w.seed}:${h.id}:form:${k}`)-.5)*.012,-.04,.04);
 p.formMemory=p.currentForm;p.lastFormUpdateDay=w.day;
}
export function formFactor(w,h,raceKey){
 updateForm(w,h);const p=h.reliability,traits=h.traits||[];
 let volatility=p.dailyVolatility;if(traits.includes('Consistent Performer')||traits.includes('Reliable Professional'))volatility*=.55;
 if(traits.includes('Unpredictable')||traits.includes('Hot-And-Cold Performer')||traits.includes('Notoriously Unpredictable'))volatility=Math.max(.12,volatility*2);
 return 1+p.currentForm+(draw(`${w.seed}:${h.id}:${raceKey}:day-performance`)-.5)*2*Math.min(.20,volatility);
}
export function recordForm(w,h,start){if(start.performanceRating==null)return;initializeForm(w,h);h.reliability.recentRaceOutputs.push({resultId:start.resultId,day:start.day,rating:start.performanceRating,formFactor:start.formVariation,distance:start.distance,surface:start.surface});h.reliability.recentRaceOutputs=h.reliability.recentRaceOutputs.slice(-40);h.reliability.observedConfidence=Math.min(1,h.starts.length/12);}
