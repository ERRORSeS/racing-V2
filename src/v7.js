import {initializeDurability,recordFirstStart,recordExposure,recordClinicalHistory,durabilityDay,completeRacingCareer} from './durability.js';
import {initializeAppraisal,recordVerifiedStart,recordMaterialValue,refreshMaterialValue} from './valuation.js';
import {event} from './core.js';
export function initializeV7World(w,{fresh=false}={}){
 if(!fresh&&w.v7Migration?.version===7)return w;
 for(const h of Object.values(w.horses)){
  const p=initializeDurability(w,h);
  if(fresh||!p.historyInitialized){p.cumulativeRacingStrain=Math.min(1000,h.starts.length*4);p.historyInitialized=true;p.historyProvenance='Reconstructed from actual starts and recorded clinical cases; unknown historical injuries remain unknown.';for(const m of w.medical.filter(m=>m.horseId===h.id))recordClinicalHistory(w,h,m);recordFirstStart(w,h);}
  initializeAppraisal(w,h,{fresh});durabilityDay(w,h);refreshMaterialValue(w,h);
 }
 w.v7Migration={version:7,day:w.v7Migration?.day??w.day,policy:'Existing results, paid prices, earnings, genes and skills preserved; anchored appraisals and first-start clock.'};
 return w;
}
export function settleV7Race(w,result){
 for(const row of result.rows){const h=w.horses[row.horseId];const p=recordFirstStart(w,h);if(result.historical){p.cumulativeRacingStrain=Math.max(p.cumulativeRacingStrain,Math.min(1000,h.starts.length*4));continue;}
  const start=h.starts.find(s=>s.resultId===result.id);const change=start&&recordVerifiedStart(w,h,start);
  if(result.classId==='g1'&&row.place===1)for(const parentId of [h.sire,h.dam]){const parent=w.horses[parentId];if(parent)recordMaterialValue(w,parent,'Verified offspring G1 result',`progeny:${result.id}:${h.id}`);}
  if(change&&result.classId==='g1'&&Math.abs(Number(change.change)/Number(change.previousValue))>=.15)event(w,'valuation',`${h.name}: verified ${result.title} performance changes market appraisal to ${(BigInt(change.value)/100n).toString()} USD; this is an estimate, not a sale price.`,h.id);
 }
}
export function monthlyV7Review(w,h){
 if(h.owner==='archive')return;
 recordMaterialValue(w,h,'Monthly racing/breeding outlook',`month:${Math.floor(w.day/30)}`);
}
