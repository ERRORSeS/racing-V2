import {fastMode,fastOwned,markFastHorse} from './fast-mode.js';
import { recordMaterialValue } from './valuation.js';
import { RULES, dateLabel, clamp } from './rules.js';
import { integer, random } from './random.js';
import { event, charge, ownedHorse } from './core.js';

export const REPRODUCTION_RULES=Object.freeze({version:8,estimate:[340,345],range:[320,365],firstScan:15,heartbeat:28,development:50,scanFee:'15000',lossChance:.015,twinChance:.012,recoveryDays:30});
const active=p=>!['foaled','lost'].includes(p.status);
export function reproductiveEvent(w,type,key,mareId,text){w.reproductiveEvents??=[];if(w.reproductiveEvents.some(e=>e.id===key))return;w.reproductiveEvents.push({id:key,day:w.day,type,mareId,text});event(w,'breeding',text,mareId);}
export function initializeReproduction(w){
 w.breedingAttempts??=[];w.pregnancies??=[];w.pregnancyScans??=[];w.studContracts??=[];w.reproductiveEvents??=[];
 const existingAttempts=new Set(w.breedingAttempts.map(a=>a.id));
 for(const c of w.coverings||[]){if(existingAttempts.has(c.id))continue;
  const day=Number.isSafeInteger(c.day)?c.day:null,confirmed=c.status==='pregnant',foaled=c.status==='foaled';
  const a={id:c.id,mareId:c.damId,stallionId:c.sireId,breedingCycleId:`legacy-${c.id}`,method:c.method==='natural'?'natural':c.method==='frozen'?'creative_ai':'unknown',serviceDayIndexes:day==null?[]:[day],firstServiceDayIndex:day,ownerAtCoveringId:c.owner??null,contractId:`contract-${c.id}`,outcome:c.conceived===false||c.status==='not conceived'?'not_conceived':confirmed||foaled||c.status==='lost'?'conceived':'pending',legacy:true};
  w.breedingAttempts.push(a);w.studContracts.push(contractFrom(w,c,a,true));
  if(confirmed||foaled||c.status==='lost'){
   const p=pregnancyFrom(w,c,a,Number.isSafeInteger(c.dueDay)?c.dueDay:null,null,true);p.status=foaled?'foaled':c.status==='lost'?'lost':'needs_recheck';p.legacyConfirmation=confirmed;p.liveFoalId=c.foalId||null;p.actualFoalingDayIndex=c.foalId?w.horses[c.foalId]?.born??null:null;p.recordedOutcome=foaled?'live_foal':c.status==='lost'?'loss':null;w.pregnancies.push(p);a.linkedPregnancyId=p.id;if(confirmed)w.pregnancyScans.push({id:`scan-${c.id}-legacy-review`,attemptId:c.id,mareId:c.damId,kind:'legacy pregnancy review',dueDay:w.day+1,status:'recommended'});
  }
 }
 // Completed pregnancies remain permanent history, never an active booking.
 for(const p of w.pregnancies)if(!active(p)){
  const h=w.horses[p.mareId];if(!h)continue;
  if(h.pregnancy===p.id||h.pregnancy===p.breedingAttemptId){h.pregnancy=null;markFastHorse(w,h.id);}
  if(h.activeBreedingAttempt===p.breedingAttemptId){h.activeBreedingAttempt=null;markFastHorse(w,h.id);}
 }
 w.reproductionVersion=8;
}
function contractFrom(w,c,a,legacy=false){return {id:a.contractId,attemptId:a.id,mareId:c.damId,sireId:c.sireId,serviceDayIndexes:a.serviceDayIndexes.slice(),mareOwnerAtCovering:c.owner??null,sireOwnerAtCovering:legacy?null:w.horses[c.sireId]?.owner,breederOfRecord:c.breeder??c.owner??null,fee:c.fee??null,method:a.method,registryEligibility:c.registryEligibility??'unknown',offspringRights:'Foal belongs to the mare owner at birth; breeder of record remains the covering breeder.',legacy,createdDay:c.day??null};}
function pregnancyFrom(w,c,a,target,estimate,legacy=false){const day=a.firstServiceDayIndex,term=estimate??(day!=null&&target!=null?target-day:342),estimated=day==null?(legacy&&target!=null?target:null):day+term;return {id:`pregnancy-${a.id}`,breedingAttemptId:a.id,mareId:c.damId,sireId:c.sireId,recordedCoverDayIndex:day,estimatedConceptionDayIndex:day,status:'unconfirmed',initialEstimatedGestationDays:term,currentEstimatedGestationDays:term,hiddenCommittedOutcomeDayIndex:target,estimatedDueDayIndex:estimated,expectedWindowStartDayIndex:estimated==null?null:estimated-15,expectedWindowEndDayIndex:estimated==null?null:estimated+20,scanEventIds:[],mareMedicalCaseIds:[],registryModeAtCovering:c.registryEligibility??'unknown',createdAtWorldRevision:w.storageRevision||0,schemaVersion:8,legacy,confirmedOn:null,carePlan:'Routine broodmare monitoring',foalingWatch:false};}
export function recordCovering(w,c){
 initializeReproduction(w); // The new covering is appended by the caller after initialization.
 const a={id:c.id,mareId:c.damId,stallionId:c.sireId,breedingCycleId:`cycle-${c.damId}-${c.day}`,method:c.method==='natural'?'natural':'creative_ai',serviceDayIndexes:[c.day],firstServiceDayIndex:c.day,estimatedOvulationDayIndex:c.day,contractId:`contract-${c.id}`,ownerAtCoveringId:c.owner,outcome:'pending',schemaVersion:8};
 w.breedingAttempts.push(a);w.studContracts.push(contractFrom(w,c,a));
 if(c.conceived){const estimate=integer(w,...REPRODUCTION_RULES.estimate),term=Math.round((integer(w,320,365)+integer(w,330,355)+integer(w,337,348))/3),p=pregnancyFrom(w,c,a,c.day+term,estimate);p.twinRisk=random(w)<REPRODUCTION_RULES.twinChance;p.committedLossDay=random(w)<REPRODUCTION_RULES.lossChance?c.day+integer(w,35,180):null;w.pregnancies.push(p);a.linkedPregnancyId=p.id;c.dueDay=p.hiddenCommittedOutcomeDayIndex;}
 w.horses[c.damId].activeBreedingAttempt=c.id;
 for(const [kind,offset]of [['ultrasound',15],['heartbeat',28],['development',50]])w.pregnancyScans.push({id:`scan-${c.id}-${kind}`,attemptId:c.id,mareId:c.damId,kind,dueDay:c.day+offset,status:'recommended'});
 reproductiveEvent(w,'CoveringPerformed',`covered-${c.id}`,c.damId,`${w.horses[c.damId].name}: covered by ${w.horses[c.sireId].name} on ${dateLabel(c.day)}; pregnancy not yet confirmed. First scan due ${dateLabel(c.day+15)}.`);return a;
}
export function currentAttempt(w,h){return w.breedingAttempts?.find(a=>a.id===h.activeBreedingAttempt)||w.breedingAttempts?.filter(a=>a.mareId===h.id).at(-1);}
// Derive recovery from permanent birth records too, so older 45-day saves
// gain the six-month rule without rewriting reproductive history.
export function mareRecovery(w,h){
 const pregnancies=(w.pregnancies||[]).filter(p=>p.mareId===h.id);
 let lastFoalingDay=null;
 for(const p of pregnancies)if(p.status==='foaled'){
  const day=p.actualFoalingDayIndex??w.horses[p.liveFoalId]?.born;
  if(Number.isSafeInteger(day))lastFoalingDay=Math.max(lastFoalingDay??day,day);
 }
 for(const c of w.coverings||[])if(c.damId===h.id&&c.status==='foaled'){
  const day=w.horses[c.foalId]?.born;
  if(Number.isSafeInteger(day))lastFoalingDay=Math.max(lastFoalingDay??day,day);
 }
 const linked=pregnancies.find(p=>p.id===h.pregnancy||p.breedingAttemptId===h.pregnancy)||w.coverings?.find(c=>c.id===h.pregnancy);
 const pregnant=pregnancies.some(active)||!!(h.pregnancy&&(!linked||!['foaled','lost','not conceived'].includes(linked.status)));
 return {pregnant,lastFoalingDay,until:Math.max(h.postFoalingUntil||0,lastFoalingDay==null?0:lastFoalingDay+RULES.postFoalingRest)};
}
export function pregnancySummary(w,h){
 if(!h||h.sex!=='filly')return null;const recovery=mareRecovery(w,h),a=currentAttempt(w,h);if(!a)return {stage:recovery.until>w.day?'Nursing / postpartum':'Open',mareId:h.id,...(recovery.lastFoalingDay==null?{}:{breedableOn:recovery.until})};
 const p=w.pregnancies?.find(p=>p.breedingAttemptId===a.id),confirmed=!!(p?.confirmedOn!=null||p?.legacyConfirmation),closed=p&&!active(p),scan=w.pregnancyScans?.filter(s=>s.attemptId===a.id&&!['completed','canceled'].includes(s.status)).sort((a,b)=>a.dueDay-b.dueDay)[0];
 const stage=p?.status==='foaled'?(recovery.until>w.day?'Nursing / postpartum':'Open'):p?.status==='lost'?'Pregnancy ended':a.outcome==='not_conceived'?'Not in foal':!confirmed?(w.day>=(scan?.dueDay??Infinity)?'Needs Scan':'Covered'):p.status==='needs_recheck'?'Needs Recheck':w.day-(p.estimatedConceptionDayIndex??w.day)>=300?'Near Foaling':'Pregnant';
 return {mareId:h.id,...(recovery.lastFoalingDay==null?{}:{breedableOn:recovery.until}),attemptId:a.id,sourceEventIds:(w.reproductiveEvents||[]).filter(e=>e.mareId===h.id).map(e=>e.id),followUp:scan?.dueDay??null,pregnancyId:p?.id??null,sireId:a.stallionId,coveredOn:a.firstServiceDayIndex,confirmedOn:p?.confirmedOn??null,legacyConfirmation:!!p?.legacyConfirmation,stage,confirmed:confirmed&&!closed,gestationDay:confirmed&&!closed&&p.estimatedConceptionDayIndex!=null?Math.max(0,w.day-p.estimatedConceptionDayIndex):null,gestationLength:confirmed&&!closed?p.currentEstimatedGestationDays:null,dueEstimate:confirmed&&!closed?p.estimatedDueDayIndex:null,dueWindow:confirmed&&!closed?[p.expectedWindowStartDayIndex,p.expectedWindowEndDayIndex]:null,remainingDays:confirmed&&!closed&&p.estimatedDueDayIndex!=null?p.estimatedDueDayIndex-w.day:null,scan:scan||null,foalId:p?.liveFoalId||null,actualFoalingDay:p?.actualFoalingDayIndex??null,endedDay:p?.endedDay??null,contractId:a.contractId,carePlan:p?.carePlan??null,foalingWatch:!!p?.foalingWatch,nextAction:closed?(recovery.until>w.day?`Postpartum recovery until ${dateLabel(recovery.until)}`:h.reproductiveReviewRequired?'Book reproductive clearance':'Choose a stallion for another covering'):a.outcome==='not_conceived'?'Reassess after recovery':scan?'Book pregnancy scan':'Continue broodmare monitoring'};
}
export function bookPregnancyScan(w,mareId){
 const h=ownedHorse(w,mareId),a=currentAttempt(w,h);if(!a||a.outcome==='not_conceived')throw Error('No active covering requires a pregnancy scan.');
 const p=w.pregnancies.find(p=>p.breedingAttemptId===a.id);if(p&&!active(p))throw Error('This pregnancy has ended.');
 const doneToday=w.pregnancyScans.find(s=>s.attemptId===a.id&&s.status==='completed'&&s.completedDay===w.day);if(doneToday)return doneToday;
 let s=w.pregnancyScans.filter(s=>s.attemptId===a.id&&!['completed','canceled'].includes(s.status)).sort((a,b)=>a.dueDay-b.dueDay)[0];
 if(!s){s={id:`scan-${a.id}-review-${w.day}`,attemptId:a.id,mareId,kind:'review',dueDay:w.day,status:'recommended'};w.pregnancyScans.push(s);}
 s.status='booked';if(w.day>=s.dueDay)return completeScan(w,s);return s;
}
export function completeScan(w,s){
 if(s.status==='completed'||s.status==='canceled'||w.day<s.dueDay)return s;const a=w.breedingAttempts.find(a=>a.id===s.attemptId),h=w.horses[s.mareId],p=w.pregnancies.find(p=>p.breedingAttemptId===a?.id);if(!h||h.status==='deceased'||p&&!active(p)){s.status='canceled';return s;}
 charge(w,h,REPRODUCTION_RULES.scanFee,'Pregnancy scan',s.id);s.status='completed';s.completedDay=w.day;s.result=!p?'negative':p.twinRisk&&!p.twinManaged?'multiple-risk':'positive';
 const before=p?.confirmedOn;
 if(!p){a.outcome='not_conceived';const c=w.coverings.find(c=>c.id===a.id);if(c)c.status='not conceived';h.activeBreedingAttempt=null;h.postFoalingUntil=Math.max(h.postFoalingUntil,w.day+7);for(const x of w.pregnancyScans)if(x.attemptId===a.id&&x.id!==s.id&&x.status!=='completed')x.status='canceled';}
 else{a.outcome='conceived';p.confirmedOn??=w.day;p.scanEventIds.push(s.id);p.status=s.result==='multiple-risk'?'needs_recheck':p.estimatedConceptionDayIndex!=null&&w.day-p.estimatedConceptionDayIndex>=300?'late_term':'confirmed';if(s.result==='multiple-risk'&&!w.pregnancyScans.some(x=>x.id===`scan-${a.id}-twin-review`))w.pregnancyScans.push({id:`scan-${a.id}-twin-review`,attemptId:a.id,mareId:h.id,kind:'multiple-risk review',dueDay:w.day+7,status:'recommended'});}
 s.report=!p?'Negative ultrasound: not in foal. Covering and fees remain recorded; reassess after recovery.':s.result==='multiple-risk'?'Pregnancy confirmed; higher-risk multiple pregnancy finding. Veterinary monitoring and recheck required; no extra foal is created.':`${s.kind}: pregnancy confirmed, development consistent with the modeled stage. Expected dates remain estimates.`;
 w.visits.push({id:s.id,horseId:h.id,day:w.day,type:'vet',action:'pregnancy-scan',report:s.report,attemptId:a.id,pregnancyId:p?.id||null});
 reproductiveEvent(w,'PregnancyScanCompleted',`scan-report-${s.id}`,h.id,`${h.name}: ${s.report}`);
 if(p&&before==null)recordMaterialValue(w,h,'Veterinary-confirmed pregnancy',`pregnancy-confirmed-${p.id}`);
 if(p&&before==null)reproductiveEvent(w,'PregnancyConfirmed',`confirmed-${p.id}`,h.id,`${h.name}: pregnancy confirmed by veterinary scan on ${dateLabel(w.day)}.`);
 if(p&&s.kind==='multiple-risk review'&&p.twinManaged)p.status='confirmed';
 if(s.result==='multiple-risk')reproductiveEvent(w,'PregnancyRecheckScheduled',`recheck-${s.id}`,h.id,`${h.name}: pregnancy recheck recommended in seven days.`);return s;
}
export function setBroodmareCare(w,mareId,watch=false){const h=ownedHorse(w,mareId),a=currentAttempt(w,h),p=w.pregnancies.find(p=>p.breedingAttemptId===a?.id);if(!a||p&&!active(p))throw Error('Choose a currently covered or pregnant mare.');h.feed=p&&w.day-(p.estimatedConceptionDayIndex??w.day)>=240?'Broodmare':'Balanced';h.turnout=h.clearance==='No Work'?Math.min(h.turnout,2):Math.max(h.turnout,6);h.autoTrain=false;if(p){p.carePlan='Stage-appropriate feed, water, safe movement and routine hoof care';p.foalingWatch=watch||p.foalingWatch;if(p.twinRisk){p.twinManaged=true;p.status='needs_recheck';}}reproductiveEvent(w,'MareCarePlanned',`care-${a.id}-${w.day}-${watch}`,h.id,`${h.name}: broodmare care${watch?' and foaling watch':''} planned; genetics unchanged.`);}
export function recordPregnancyLoss(w,p,reason='Pregnancy ended; veterinary follow-up and recovery required.'){
 if(!p||!active(p))return;const h=w.horses[p.mareId],c=w.coverings.find(c=>c.id===p.breedingAttemptId);p.status='lost';p.recordedOutcome='loss';p.endedDay=w.day;const attempt=w.breedingAttempts.find(a=>a.id===p.breedingAttemptId);if(attempt)attempt.outcome='conceived';if(c)c.status='lost';if(h){h.pregnancy=null;h.activeBreedingAttempt=null;h.reproductiveReviewRequired=true;h.postFoalingUntil=Math.max(h.postFoalingUntil,w.day+REPRODUCTION_RULES.recoveryDays);}for(const s of w.pregnancyScans)if(s.attemptId===p.breedingAttemptId&&s.status!=='completed')s.status='canceled';w.visits.push({id:`loss-${p.id}`,horseId:h.id,day:w.day,type:'vet',action:'pregnancy-outcome',report:reason});recordMaterialValue(w,h,'Pregnancy outcome',`pregnancy-loss-${p.id}`);reproductiveEvent(w,'PregnancyOutcomeRecorded',`loss-${p.id}`,h.id,`${h.name}: ${reason}`);
}
export function reviewReproductiveRecovery(w,mareId,npc=false){const h=npc?w.horses[mareId]:ownedHorse(w,mareId);if(!h||h.status==='deceased')throw Error('A live mare is required.');if(!h.reproductiveReviewRequired)throw Error('No reproductive recovery review is pending.');if(w.day<h.postFoalingUntil||h.medicalCase)throw Error('Recovery and medical treatment must finish before reproductive clearance.');charge(w,h,RULES.vetFee,'Reproductive clearance',h.id);h.reproductiveReviewRequired=false;w.visits.push({id:`repro-clear-${h.id}-${w.day}`,horseId:h.id,day:w.day,type:'vet',report:'Reproductive recovery reviewed; cleared for future breeding.'});}
export function reproductionDay(w){
 initializeReproduction(w);
 for(const s of w.pregnancyScans){if(['completed','canceled'].includes(s.status)||s.dueDay>w.day)continue;const h=w.horses[s.mareId];if(fastMode(w)&&h.owner!=='player'&&!h.ownership.some(o=>o.owner==='player'))continue;if(!s.notified){s.notified=true;w.notifications.push({id:`reminder-${s.id}`,day:w.day,horseId:h.id,text:`${h.name}: ${s.kind} due.`,type:'breeding'});}if(s.status==='booked'||h.autoVet||h.owner!=='player'){try{completeScan(w,s);}catch(error){s.paymentError=error.message;}}}
 for(const p of w.pregnancies){if(!active(p))continue;const h=w.horses[p.mareId];if(fastMode(w)&&h.owner!=='player'&&!h.ownership.some(o=>o.owner==='player'))continue;markFastHorse(w,h.id);if(h.status==='deceased'||p.committedLossDay!=null&&w.day>=p.committedLossDay){recordPregnancyLoss(w,p);continue;}if(p.confirmedOn!=null&&p.status!=='needs_recheck'&&w.day-(p.estimatedConceptionDayIndex??w.day)>=300)p.status='late_term';if(h.autoCare&&w.day-(p.estimatedConceptionDayIndex??w.day)>=240){h.feed='Broodmare';h.condition=clamp(h.condition+.002,3,7);}if(p.foalingWatch&&w.day>=p.expectedWindowStartDayIndex&&!p.watchNotified){p.watchNotified=true;w.notifications.push({id:`watch-${p.id}`,day:w.day,horseId:h.id,text:`${h.name}: estimated foaling window has begun.`,type:'breeding'});}}
 for(const h of fastMode(w)?fastOwned(w):Object.values(w.horses))if(h.reproductiveReviewRequired&&h.status!=='deceased'&&h.postFoalingUntil<=w.day&&!h.medicalCase&&(h.autoVet||h.owner!=='player')){try{reviewReproductiveRecovery(w,h.id,true);}catch{/* A later day may have enough funds; no clearance is invented. */}}
}
export function recordFoaling(w,c,h){markFastHorse(w,c.damId,c.sireId);const a=w.breedingAttempts.find(a=>a.id===c.id),p=w.pregnancies.find(p=>p.breedingAttemptId===c.id);if(p){p.status='foaled';p.recordedOutcome='live_foal';p.actualFoalingDayIndex=h.born;p.liveFoalId=h.id;}if(a)a.outcome='conceived';w.horses[c.damId].activeBreedingAttempt=null;for(const s of w.pregnancyScans)if(s.attemptId===c.id&&s.status!=='completed')s.status='canceled';recordMaterialValue(w,w.horses[c.damId],'Foaling and postpartum',`pregnancy-foaled-${c.id}`);reproductiveEvent(w,'FoalingCompleted',`foaled-${c.id}`,c.damId,`${w.horses[c.damId].name}: foaled ${h.name} on ${dateLabel(h.born)}.`);reproductiveEvent(w,'MarePostpartumStarted',`postpartum-${c.id}`,c.damId,`${w.horses[c.damId].name}: nursing and postpartum recovery started.`);}
export function gestationDuration(days){return `${Math.floor(days/30)} months, ${days%30} days`;}
