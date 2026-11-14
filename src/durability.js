import {age,clamp,dateLabel} from './rules.js';
import {seed} from './random.js';
import {event,scratchEntries} from './core.js';
export const MAX_RACING_DAYS=1800;
const severityLoad={Easy:2,Medium:5,'More Than Medium':10,Severe:18,'Very Severe':30};
export function initializeDurability(w,h){
 let p=h.racingDurability;
 if(!p){const structure=Object.values(h.conformation||{}).reduce((n,v)=>n+v,0)/Math.max(1,Object.keys(h.conformation||{}).length)*10;
  const inherited=(h.potential?.recovery??50)*.5+structure*.35+(seed(`${w.seed}:${h.id}:durability-v7`)/4294967296)*15;
  const latent=clamp(inherited),years=clamp(1+latent/25,1,5);
  p=h.racingDurability={version:7,firstRaceDate:null,firstRacingAge:null,maximumCareerDurationDays:Math.min(MAX_RACING_DAYS,Math.max(360,Math.round((w.settings?.maximumRacingCareerYears??5)*360))),absoluteRaceEndDate:null,latentDurabilityScore:latent,latentRecoveryCapacity:h.potential?.recovery??50,baselineConformationRisk:clamp(100-structure),individualRacingLongevity:years,cumulativeRacingStrain:0,repetitiveStressIndex:0,chronicSusceptibility:0,limbRegionStatus:[],exposureHistory:[],recentWorkload7d:0,recentWorkload30d:0,lastDurabilityUpdatedDate:w.day,observedStarts:-1,racingRetirementReason:h.status==='retired'?'Previously retired':null,historyProvenance:'Individual predisposition from inherited recovery, conformation and deterministic variation; not a predicted injury date'};
  h.durabilityEvents??=[];
 }
 const configured=Math.min(MAX_RACING_DAYS,Math.max(360,Math.round((w.settings?.maximumRacingCareerYears??5)*360)));
 if(p.maximumCareerDurationDays!==configured){p.maximumCareerDurationDays=configured;p.absoluteRaceEndDate=p.firstRaceDate==null?null:p.firstRaceDate+configured;}
 if(p.observedStarts!==h.starts.length){const first=h.starts.length?Math.min(...h.starts.map(s=>s.day)):null;p.firstRaceDate=first;p.firstRacingAge=first==null?null:age(h,first);p.absoluteRaceEndDate=first==null?null:first+p.maximumCareerDurationDays;p.observedStarts=h.starts.length;}
 for(const region of p.limbRegionStatus){const m=w.medical?.find(m=>m.id===region.caseId);if(m)region.status=m.status;}
 return p;
}
export function careerWindow(h,day){const p=h.racingDurability;if(!p)return {remainingDays:null,end:null,started:false,expired:false};return {remainingDays:p.absoluteRaceEndDate==null?null:Math.max(0,p.absoluteRaceEndDate-day),end:p.absoluteRaceEndDate,started:p.firstRaceDate!=null,expired:p.absoluteRaceEndDate!=null&&day>=p.absoluteRaceEndDate};}
export function racingWindowReason(w,h,day=w.day){const p=initializeDurability(w,h);return p.absoluteRaceEndDate!=null&&day>=p.absoluteRaceEndDate?`Racing career window completed: no starts on or after ${dateLabel(p.absoluteRaceEndDate)} (maximum ${p.maximumCareerDurationDays/360} racing years from debut).`:null;}
export function durabilityEvent(w,h,type,details={}){h.durabilityEvents??=[];const e={id:`durability-${h.id}-${h.durabilityEvents.length+1}`,day:w.day,type,...details};h.durabilityEvents.push(e);return e;}
export function recordFirstStart(w,h){const p=initializeDurability(w,h);if(p.firstRaceDate!=null&&!p.firstStartRecorded){p.firstStartRecorded=true;durabilityEvent(w,h,'First official start',{firstRaceDate:p.firstRaceDate,absoluteRaceEndDate:p.absoluteRaceEndDate});}return p;}
export function completeRacingCareer(w,h){const p=initializeDurability(w,h);if(h.status!=='active'||!careerWindow(h,w.day).expired)return false;
 h.status='retired';h.retiredDay=w.day;h.autoTrain=false;h.autoRace=false;h.brood=h.sex!=='gelding'&&h.soundness>=65;h.autoRaceStatus='Racing Career Completed';p.racingRetirementReason='Racing Career Completed';scratchEntries(w,h,'five-year racing career completed');durabilityEvent(w,h,'Racing Career Completed',{windowEnd:p.absoluteRaceEndDate});event(w,'life',`${h.name}: Racing Career Completed. Health and lifelong records are preserved; breeding and aftercare remain available.`,h.id);return true;
}
export function recordRetirement(w,h,reason){const p=initializeDurability(w,h);p.racingRetirementReason=reason+(p.firstRaceDate==null?' · Never Raced':'');durabilityEvent(w,h,'Racing retirement',{reason:p.racingRetirementReason});}
export function recordExposure(w,h,context,{load=0,activity=context}={}){
 const p=initializeDurability(w,h);if(!['training','race','travel'].includes(context)||load<=0)return;
 p.exposureHistory=p.exposureHistory.filter(e=>e.day>w.day-30);if(p.exposureHistory.some(e=>e.day===w.day&&e.context===context))return;
 const repeat=1+Math.max(0,p.repetitiveStressIndex-25)/100,base=context==='race'?load*.18:context==='travel'?load*.01:load*.025;
 p.cumulativeRacingStrain=clamp(p.cumulativeRacingStrain+base*repeat*(1.3-p.latentDurabilityScore/200),0,1000);
 p.repetitiveStressIndex=clamp(p.repetitiveStressIndex+load*.32);
 p.exposureHistory.push({day:w.day,context,activity,load});updateLoads(p,w.day);
 if(context==='race'||w.day%30===0)durabilityEvent(w,h,'Workload exposure',{context,load,cumulativeStrain:p.cumulativeRacingStrain});
}
function updateLoads(p,day){p.exposureHistory=p.exposureHistory.filter(e=>e.day>day-30);p.recentWorkload7d=p.exposureHistory.filter(e=>e.day>day-7).reduce((n,e)=>n+e.load,0);p.recentWorkload30d=p.exposureHistory.reduce((n,e)=>n+e.load,0);}
export function recordClinicalHistory(w,h,m){const p=initializeDurability(w,h);if(p.limbRegionStatus.some(r=>r.caseId===m.id))return;
 const amount=severityLoad[m.severity]||2;p.chronicSusceptibility=clamp(p.chronicSusceptibility+amount);p.cumulativeRacingStrain=clamp(p.cumulativeRacingStrain+amount*2,0,1000);
 p.limbRegionStatus.push({region:/hoof/i.test(m.diagnosis)?'Hoof':/muscle/i.test(m.diagnosis)?'Muscular system':'Unspecified limb / body region',caseId:m.id,diagnosis:m.diagnosis,severity:m.severity,status:m.status,day:m.day});durabilityEvent(w,h,'Clinical finding',{caseId:m.id,diagnosis:m.diagnosis,severity:m.severity});
}
export function durabilityDay(w,h){const p=initializeDurability(w,h);if(h.status==='deceased')return;
 if(p.lastDurabilityUpdatedDate<w.day){const days=w.day-p.lastDurabilityUpdatedDate,rest=!!h.breakPlan&&h.breakPlan.stage!=='Complete'||h.therapy?.status==='active';p.repetitiveStressIndex=Math.max(0,p.repetitiveStressIndex-days*(rest?1.8:.65));p.lastDurabilityUpdatedDate=w.day;updateLoads(p,w.day);for(const r of p.limbRegionStatus){const m=w.medical.find(m=>m.id===r.caseId);if(m)r.status=m.status;}}
 const window=careerWindow(h,w.day),reserve=Math.min(p.individualRacingLongevity,window.remainingDays==null?5:window.remainingDays/360);
 h.safeRacingYears=Math.min(h.safeRacingYears??reserve,reserve);completeRacingCareer(w,h);
}
export function projectedWindow(h,day){const p=h.racingDurability,window=careerWindow(h,day);if(!p)return {low:1,high:5,label:'Assessment needed'};
 const expected=clamp(Math.min(p.individualRacingLongevity,Math.max(0,h.safeRacingYears??p.individualRacingLongevity))-p.cumulativeRacingStrain/180-p.chronicSusceptibility/70-p.repetitiveStressIndex/80-Math.max(0,100-h.soundness)/100,0,5),remaining=Math.min(expected,window.remainingDays==null?5:window.remainingDays/360);
 return {low:Math.max(0,remaining-.75),high:Math.min(5,remaining+.75,window.remainingDays==null?5:window.remainingDays/360),label:remaining<1.5?'Limited':remaining<3?'Moderate':'Longer',expected};
}
export function restoreCareerReserve(w,h,gain){const p=initializeDurability(w,h),window=careerWindow(h,w.day);h.safeRacingYears=Math.min(Math.max(0,(h.safeRacingYears||0)+gain),p.individualRacingLongevity,window.remainingDays==null?5:window.remainingDays/360);}

export function editDurability(w,h,{score,years}){
 if(!w.settings.creativeMode)throw Error('Exact durability editing requires Creative Mode.');if(!Number.isFinite(score)||score<0||score>100||!Number.isFinite(years)||years<1||years>5)throw Error('Durability must be 0–100 and projected longevity 1–5 years.');
 const p=initializeDurability(w,h);p.latentDurabilityScore=score;p.individualRacingLongevity=years;h.safeRacingYears=Math.min(years,careerWindow(h,w.day).remainingDays==null?5:careerWindow(h,w.day).remainingDays/360);durabilityEvent(w,h,'Creative durability edit',{score,years});
}
