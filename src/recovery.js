import { initializeRacingYears } from './racing-years.js';
import { RULES, clamp, age } from './rules.js';
import { event, charge, scratchEntries, ownedHorse } from './core.js';
import { id } from './random.js';
export const BREAK_REASONS=['Routine Rest','Seasonal Holiday','Fatigue/Overtraining','Post-Race Recovery','Poor Form/Confidence','Travel Recovery','Veterinary Recommended','Active Injury Rehabilitation','Extended Medical Leave'];
export function putOnBreak(w,horseId,days=30,reason='Routine Rest'){
 const h=ownedHorse(w,horseId);if(h.status!=='active'||!Number.isInteger(days)||days<1||days>1080||!BREAK_REASONS.includes(reason))throw Error('Choose an active horse, valid reason and 1–1,080 days.');
 h.breakPlan={id:id(w,'break'),startDay:w.day,until:Math.max(w.day+days,h.breakPlan?.until||0),reason,stage:h.medicalCase?'Acute Rest':'Rest',reviewed:false};scratchEntries(w,h,'planned break');event(w,'break',`${h.name}: ${days}-day ${reason} break; return requires review.`,h.id);
}
export function reviewBreak(w,horseId){const h=ownedHorse(w,horseId),b=h.breakPlan;if(!b)throw Error('No break is active.');if(h.medicalCase||h.clearance==='No Work')throw Error('Medical clearance is required first.');if(w.day<b.until)throw Error('The planned break is not yet complete. Extend it or review after the due date.');if(h.soundness<80||h.fatigue>35)throw Error('Recovery is insufficient for regular work.');if(h.fitness<45){b.stage='Fitness Rebuild';b.reviewed=true;event(w,'break',`${h.name}: controlled reconditioning required before return to normal work.`,h.id);return;}b.stage='Complete';b.reviewed=true;b.completedDay=w.day;event(w,'break',`${h.name}: break reviewed; regular conditioning may resume. Race fitness still matters.`,h.id);}
export function startTherapy(w,horseId,months=9,type='Long-Term Soundness Therapy'){
 const h=ownedHorse(w,horseId);if(h.status==='deceased'||!Number.isInteger(months)||months<6||months>12)throw Error('Therapy requires a live horse and a 6–12 month program.');
 if(h.therapy?.status==='active')throw Error('Therapy is already active.');
 const medical=w.medical.find(m=>m.id===h.medicalCase);if(medical?.decision==='pending'){medical.decision='treat_return';medical.decisionDay=w.day;}
 charge(w,h,RULES.rehabFee,'Long-term soundness therapy',h.id);
 initializeRacingYears(w,h);
 const startCeiling=h.potentialSoundnessCeiling,target=Math.min(h.irreversibleSoundnessLimit,startCeiling+6);
 h.therapy={id:id(w,'therapy'),startDay:w.day,endDay:w.day+months*30,type,status:'active',caseId:h.medicalCase,safeYearGain:months/12,safeYearCredited:0,startCeiling,target,monthlyCost:'15000',nextReview:w.day+30,milestones:[],totalCost:RULES.rehabFee,stage:'Controlled Rehabilitation'};
 h.clearance='Controlled Light Work';scratchEntries(w,h,'long-term rehabilitation');event(w,'medical',`${h.name}: ${months}-month ${type}; recoverable ceiling ${startCeiling.toFixed(1)} to at most ${target.toFixed(1)}, irreversible limit ${h.irreversibleSoundnessLimit}.`,h.id);
}
export function recoveryDay(w,h){
 if(h.status==='deceased')return;
 const b=h.breakPlan;if(b&&b.stage!=='Complete'){
  h.fitness=clamp(h.fitness-.06);
  if(w.day>=b.until&&!b.reviewNotified){b.stage='Review Due';b.reviewNotified=true;event(w,'break',`${h.name}: break review due before normal training or racing.`,h.id);}
 }
 const t=h.therapy;if(t?.status==='active'){
  const before=h.potentialSoundnessCeiling,progress=clamp((w.day-t.startDay)/(t.endDay-t.startDay),0,1);
  const safeCredit=(t.safeYearGain||0)*progress,extra=Math.max(0,safeCredit-(t.safeYearCredited||0));h.safeRacingYears=Math.min(10,(h.safeRacingYears??0)+extra);t.safeYearCredited=safeCredit;
  h.potentialSoundnessCeiling=Math.min(h.irreversibleSoundnessLimit,t.startCeiling+(t.target-t.startCeiling)*progress);
  h.soundness=Math.min(h.potentialSoundnessCeiling,h.soundness+.08*(h.hoofHealth>=70?1:.5)*(age(h,w.day)>18?.7:1));
  if(w.day>=t.nextReview){t.nextReview+=30;t.milestones.push({day:w.day,current:h.soundness,ceiling:h.potentialSoundnessCeiling});h.soundnessHistory.push({day:w.day,oldCeiling:before,ceiling:h.potentialSoundnessCeiling,current:h.soundness,reason:'Monthly therapy reassessment'});try{charge(w,h,t.monthlyCost,'Therapy review',t.id);t.totalCost=(BigInt(t.totalCost)+BigInt(t.monthlyCost)).toString();}catch{t.status='paused';}event(w,'medical',`${h.name}: therapy review, current ${h.soundness.toFixed(1)}, recoverable ceiling ${h.potentialSoundnessCeiling.toFixed(1)}.`,h.id);}
  if(w.day>=t.endDay){t.status='completed';t.stage='Vet Recheck';event(w,'medical',`${h.name}: therapy course completed; veterinary recheck required, no automatic racing clearance.`,h.id);}
 }
}
