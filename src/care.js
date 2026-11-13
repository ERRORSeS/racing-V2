import { RULES, FEEDS, MOODS, MOOD_FACTORS, SEVERITIES, SKILLS, age, clamp } from './rules.js';
import { random, integer, pick, id } from './random.js';
import { event, charge, ownedHorse } from './core.js';

export function feedWarnings(h, day) {
  const warnings=[];
  if(h.feed==='Recovery'&&!h.medicalCase)warnings.push('Recovery feed is intended for medical rehabilitation.');
  if(h.feed==='Senior'&&age(h,day)<15)warnings.push('Senior feed is mismatched to a young horse.');
  if(h.feed==='Young Horse'&&age(h,day)>5)warnings.push('Young Horse feed is intended for growing horses.');
  if(h.feed==='Calm & Easy'&&h.temperament>70)warnings.push('Calming feed may reduce energy in this easygoing horse.');
  if(h.feed==='Performance'&&h.status==='retired')warnings.push('Performance feed is mismatched to an inactive retiree.');
  if(h.feed==='High Energy'&&h.temperament<40)warnings.push('High-energy feed can overstimulate this spirited horse.');
  if(h.feed==='Weight Gain'&&h.condition>=5)warnings.push('Weight gain is unnecessary at the current body condition.');
  if(h.feed==='Broodmare'&&!h.pregnancy&&!h.brood)warnings.push('Broodmare feed is intended for breeding mares.');
  if(h.turnout<4)warnings.push('Limited turnout increases stress.');
  if(h.gear.fit<70)warnings.push('Equipment needs a refit.');
  return warnings;
}
export function setCare(w,horseId,plan) {
  const h=ownedHorse(w,horseId);
  if(!FEEDS.includes(plan.feed)||!Number.isFinite(plan.turnout)||plan.turnout<0||plan.turnout>24)throw Error('Choose a valid feed and turnout from 0–24 hours.');
  if(!['Snaffle','Eggbutt','D-ring'].includes(plan.bit)||!['None','Blinkers','Cheekpieces','Hood'].includes(plan.accessory))throw Error('Unsupported equipment.');
  if(h.clearance==='No Work'&&plan.turnout>2)throw Error('The veterinary plan limits turnout to two controlled hours.');
  Object.assign(h,{feed:plan.feed,turnout:plan.turnout,autoCare:!!plan.autoCare,autoVet:!!plan.autoVet,autoFarrier:!!plan.autoFarrier,gear:{bit:plan.bit,accessory:plan.accessory,fit:100}});
  event(w,'care',`Care plan saved: ${h.feed}, ${h.turnout} hours turnout; equipment refitted.`,h.id);
}
export function scratchEntries(w,h,reason) {
  for(const f of w.fixtures)for(const e of f.entries||[])if(e.horseId===h.id&&f.status==='scheduled'){
    if(e.owner==='player'&&e.fee) { // Refund a welfare scratch exactly once.
      w.balance=(BigInt(w.balance)+BigInt(e.fee)).toString();w.ledger.push({id:id(w,'ledger'),day:w.day,amount:e.fee,category:'Welfare scratch refund',source:f.id,balance:w.balance});
    }
    f.entries=f.entries.filter(x=>x!==e);event(w,'racing',`${h.name} scratched: ${reason}.`,h.id);
  }
}
export function injure(w,h,severity='Easy',diagnosis='Soft-tissue strain') {
  if(h.medicalCase||h.status==='deceased')return null;
  if(!SEVERITIES[severity])throw Error('Unknown medical severity.');
  const [min,max]=SEVERITIES[severity], duration=integer(w,min,max);
  const m={id:id(w,'medical'),horseId:h.id,day:w.day,severity,diagnosis,minDays:min,maxDays:max,recoveryDay:w.day+duration,followUp:w.day+30,status:'active',rehab:false,ceiling:severity==='Very Severe'?75:severity==='Severe'?90:100};
  w.medical.push(m);h.medicalCase=m.id;h.clearance='No Work';h.soundness=Math.min(h.soundness,severity==='Easy'?75:severity==='Medium'?65:45);h.turnout=Math.min(2,h.turnout);h.exposureDay=w.day;
  scratchEntries(w,h,'veterinary restriction');event(w,'medical',`${h.name}: ${diagnosis}, ${severity}. Recovery estimate ${min}–${max} days; veterinary clearance required.`,h.id);
  if(severity==='Very Severe'&&w.settings.fatalities&&random(w)<.015){h.status='deceased';h.clearance='No Work';m.status='closed';event(w,'life',`${h.name} died following a serious medical complication. Their history and family records are preserved.`,h.id);}
  return m;
}
export function vet(w,horseId,action='examine') {
  const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('A live horse is required.');
  const m=w.medical.find(x=>x.id===h.medicalCase);
  if(action==='rehab'&&!m)throw Error('No medical case requires rehabilitation.');
  if(action==='clear'&&m&&(w.day<m.recoveryDay||h.soundness<RULES.minRaceSoundness))throw Error('Recovery is incomplete; a clearance cannot bypass the medical plan.');
  charge(w,h,action==='rehab'?RULES.rehabFee:RULES.vetFee,'Veterinary service',h.id);
  if(action==='rehab'){m.rehab=true;m.therapyStart??=w.day;m.therapyEnd=Math.max(m.recoveryDay,w.day+180);h.clearance='Controlled Light Work';}
  if(action==='clear'&&m){m.status='cleared';h.medicalCase=null;h.clearance=h.status==='retired'?'Light Work':'Race-Cleared';}
  if(action==='clear'&&!m)h.clearance=h.status==='retired'?'Light Work':'Race-Cleared';
  const report=m?`${m.diagnosis}: ${m.severity}; ${h.soundness.toFixed(1)} soundness; ${h.clearance}. Follow-up day ${m.followUp}.`:`No active medical case. Soundness ${h.soundness.toFixed(1)}, hoof health ${h.hoofHealth.toFixed(1)}. ${h.clearance}.`;
  w.visits.push({id:id(w,'visit'),horseId:h.id,day:w.day,type:'vet',action,report});event(w,'medical',`${h.name}: ${action}. ${report}`,h.id);
}
export function farrier(w,horseId,shoe='Standard') {
  const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('A live horse is required.');
  if(!['Standard','Turf grip','Dirt plate','Barefoot'].includes(shoe))throw Error('Choose supported shoeing.');
  if(h.lastFarrier===w.day)throw Error('Hoof care already completed today.');
  charge(w,h,RULES.farrierFee,'Farrier',h.id);h.hoofHealth=clamp(h.hoofHealth+15+(w.staff.find(s=>s.owner===h.owner&&s.role==='Farrier')?.skill||0)/30);h.farrierDue=w.day+RULES.farrierCycle;h.lastFarrier=w.day;h.shoes=shoe;
  const report=`Hooves inspected and balanced; ${shoe}; next visit in ${RULES.farrierCycle} days. Cooperation ${Math.round((h.temperament+100-h.spookiness+h.skills.handling)/3)}/100.`;
  w.visits.push({id:id(w,'visit'),horseId:h.id,day:w.day,type:'farrier',report});event(w,'farrier',`${h.name}: ${report}`,h.id);
}
export function retire(w,horseId,breeding=true) {
  const h=ownedHorse(w,horseId);if(h.status==='deceased')throw Error('This horse is deceased.');if(h.status==='retired')throw Error('Already retired.');
  h.status='retired';h.retiredDay=w.day;h.brood=breeding&&h.sex!=='gelding';h.autoTrain=false;scratchEntries(w,h,'permanent retirement');event(w,'life',`${h.name} retired from racing${h.brood?' for breeding':''}.`,h.id);
}
export function exposure(w,h,context) {
  if(h.medicalCase||h.status==='deceased'||h.exposureDay===w.day)return;h.exposureDay=w.day;
  const risk=RULES.injuryRisk*w.settings.injuryFrequency*(1+h.fatigue/25+(100-h.hoofHealth)/20)*(context==='race'?3:1);
  if(random(w)<risk){const r=random(w),severity=r<.65?'Easy':r<.85?'Medium':r<.95?'More Than Medium':r<.995?'Severe':'Very Severe';injure(w,h,severity,severity==='Very Severe'?'Bone fracture':severity==='Severe'?'Tendon concern':'Soft-tissue strain');}
}
export function train(w,h,manual=false) {
  if(h.status==='deceased')return false;
  if(h.medicalCase||h.status==='retired'||age(h,w.day)<2){
    if(h.clearance==='No Work')return false;
    if(h.lastTrainingDay===w.day)return false;
    if(manual){h.lastTrainingDay=w.day;w.sessions.push({id:id(w,'session'),horseId:h.id,day:w.day,skill:'handling',gain:0,activity:age(h,w.day)<2?'Youngstock groundwork':'Vet-approved light exercise'});h.fatigue=clamp(h.fatigue-2);return true;}return false;
  }
  if(h.soundness<80||h.fatigue>55||h.arrivalDay>w.day||h.pregnancy)return false;
  if(w.fixtures.some(f=>f.status==='scheduled'&&f.day-w.day<=2&&f.entries?.some(e=>e.horseId===h.id)))return false;
  if(h.lastTrainingDay===w.day||h.lastRaceDay===w.day)return false;
  const k=SKILLS[w.day%SKILLS.length],before=h.skills[k],trainer=w.staff.find(s=>s.owner===h.owner&&s.role==='Trainer'),learning=trainer?(.85+trainer.skill/300):1;
  const gain=RULES.trainingGain*(1-before/Math.max(1,h.potential[k]))*MOOD_FACTORS[h.mood]*(1-h.fatigue/150)*(h.soundness/100)*(h.traits.includes('Quick Learner')?1.1:1)*learning;
  h.skills[k]=Math.min(h.potential[k],before+gain);h.fatigue=clamp(h.fatigue+RULES.trainingFatigue);h.fitness=clamp(h.fitness+.3);
  h.lastTrainingDay=w.day;w.sessions.push({id:id(w,'session'),horseId:h.id,day:w.day,skill:k,gain:h.skills[k]-before,activity:`Balanced ${k}`,fatigue:h.fatigue});exposure(w,h,'training');return true;
}
export function dailyCare(w,h) {
  if(h.status==='deceased'||h.owner==='archive')return;
  if(age(h,w.day)>12)h.fitness=clamp(h.fitness-.01*(age(h,w.day)-12));
  h.fatigue=clamp(h.fatigue-(h.traits.includes('Quick Recovery')?9:RULES.restRecovery));
  const warnings=feedWarnings(h,w.day);h.acuteStress=warnings.length>=2?'Care incompatibility':h.fatigue>70?'Excessive workload':null;
  h.condition=clamp(h.condition+(h.feed==='Weight Gain'?.008:h.feed==='High Energy'?.004:(5-h.condition)*.002),1,9);
  if(w.day>h.farrierDue)h.hoofHealth=clamp(h.hoofHealth-.18);
  const m=w.medical.find(x=>x.id===h.medicalCase);
  if(m&&m.status==='active'){
    const specialist=w.staff.find(s=>s.owner===h.owner&&s.role==='Veterinarian');h.soundness=Math.min(m.ceiling,h.soundness+(m.rehab?.16:.055)*(specialist?1+specialist.skill/500:1));
    if(w.day>=m.recoveryDay&&m.ceiling<80&&h.status!=='retired'){h.status='retired';h.brood=h.sex!=='gelding';h.autoTrain=false;h.clearance='Light Work';m.status='chronic';h.medicalCase=null;event(w,'medical',`${h.name}: permanent racing retirement required after chronic injury. Breeding soundness must be reassessed.`,h.id);}
    if(w.day>=m.followUp){m.followUp+=30;event(w,'medical',`${h.name}: follow-up review due; current soundness ${h.soundness.toFixed(1)}.`,h.id);}
    if(w.day>=m.recoveryDay&&h.soundness>=80&&h.autoVet){try{vet(w,h.id,'clear');}catch{/* Budget shortage leaves restriction in place. */}}
  }
  if(h.autoFarrier&&w.day>=h.farrierDue){try{farrier(w,h.id,h.shoes||'Standard');}catch{/* Budget shortage leaves hoof-care due. */}}
  if(w.settings.operatingCosts&&h.autoCare){try{charge(w,h,'2000','Daily care',h.id);}catch{h.acuteStress='Care payment overdue';}}
  if(w.day%30===0){
    const negative=warnings.length+(h.fatigue>55?2:0)+(h.soundness<70?1:0);
    const pool=negative>=2?['Distress','Uncomfortable','No Energy',h.preferredMood]:negative?['Uncomfortable','Overly-Active','Neutral',h.preferredMood]:['Happy','Happy','Motivated','Try-Hard','Neutral','Neutral',h.preferredMood,'Grumpy','Bad Mood'];
    h.mood=pick(w,pool);event(w,'mood',`${h.name}: monthly mood ${h.mood}${warnings.length?'. '+warnings.join(' '):'; care and recovery reviewed.'}`,h.id);
  }
}
export function scheduledTraining(w,h) {
  if(!h.autoTrain)return 'Off';
  if(h.lastTrainingDay===w.day)return 'Already completed today';
  if(w.day%4===0)return 'Scheduled rest day';
  if(h.status!=='active'||h.medicalCase||h.soundness<80)return 'Paused for welfare / retirement';
  return train(w,h)?'Completed today':'Paused for fatigue, travel, age or race preparation';
}
