import { useRacingYears, racingYearsRisk } from './racing-years.js';
import { INJURY_TYPES, chooseInjury } from './injuries.js';
import { chronologicalDays, educationSession, startingSession, createStartingPlan, startingBlocker } from './youngstock.js';
import { scheduleIndex } from './reservations.js';
import { WORKOUTS, SKILL_DEFINITIONS } from './skill-definitions.js';
import { usableCeiling } from './development.js';
import { traitModifiers, observeTrait } from './traits.js';
import { recoveryDay } from './recovery.js';
import { RULES, FEEDS, MOODS, MOOD_FACTORS, SEVERITIES, SKILLS, age, clamp } from './rules.js';
import { random, integer, pick, id } from './random.js';
import { event, charge, ownedHorse, scratchEntries } from './core.js';

export function feedWarnings(h, day) {
  const warnings=[];
  if(chronologicalDays(h,day)<720&&!['Young Horse','Balanced'].includes(h.feed))warnings.push('Youngstock require a growing-horse care ration; adult performance feed is unsuitable.');
  if(h.youngstock&&chronologicalDays(h,day)<720){const y=h.youngstock;if(!y.water)warnings.push('Youngstock clean water needs attention.');if(!y.shelter)warnings.push('Youngstock shelter needs attention.');if(!y.companions.length)warnings.push('Youngstock need familiar social companions.');}
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
  Object.assign(h,{feed:plan.feed,turnout:plan.turnout,autoTravel:!!plan.autoTravel,autoCare:!!plan.autoCare,autoVet:!!plan.autoVet,autoFarrier:!!plan.autoFarrier,gear:{bit:plan.bit,accessory:plan.accessory,fit:100}});
  event(w,'care',`Care plan saved: ${h.feed}, ${h.turnout} hours turnout; equipment refitted.`,h.id);
}
export { scratchEntries } from './core.js';
export function injure(w,h,severity='Easy',diagnosis='Soft-tissue strain',context='incident',typeId=null) {
  if(h.medicalCase||h.status==='deceased')return null;
  if(!SEVERITIES[severity])throw Error('Unknown medical severity.');
  const [min,max]=SEVERITIES[severity], duration=integer(w,min,max);
  const m={id:id(w,'medical'),horseId:h.id,day:w.day,severity,diagnosis,minDays:min,maxDays:max,recoveryDay:w.day+duration,followUp:w.day+30,status:'active',context,typeId:typeId||'custom',prognosis:INJURY_TYPES[typeId]?.notes||'Veterinary reassessment determines the safe return outlook.',decision:h.owner==='player'?'pending':'treat_return',decisionDay:h.owner==='player'?null:w.day,rehab:h.owner!=='player',ceiling:severity==='Very Severe'?75:severity==='Severe'?90:100};
  useRacingYears(w,h,{Easy:.05,Medium:.15,'More Than Medium':.35,Severe:1,'Very Severe':2.5}[severity]);w.medical.push(m);h.medicalCase=m.id;h.clearance='No Work';h.soundness=Math.min(h.soundness,severity==='Easy'?75:severity==='Medium'?65:45);h.turnout=Math.min(2,h.turnout);h.exposureDay=w.day;
  h.irreversibleSoundnessLimit=Math.min(h.irreversibleSoundnessLimit??100,m.ceiling);h.potentialSoundnessCeiling=Math.min(h.potentialSoundnessCeiling??100,severity==='Severe'?82:severity==='Very Severe'?65:100);h.soundnessHistory.push({day:w.day,current:h.soundness,ceiling:h.potentialSoundnessCeiling,structuralLimit:h.irreversibleSoundnessLimit,reason:diagnosis});
  scratchEntries(w,h,'veterinary restriction');event(w,'medical',`${h.name}: ${diagnosis}, ${severity}. Recovery estimate ${min}–${max} days; veterinary clearance required.`,h.id);
  if(severity==='Very Severe'&&w.settings.fatalities&&random(w)<(INJURY_TYPES[typeId]?.fatalRisk??.015)){h.status='deceased';h.clearance='No Work';m.status='closed';m.outcome='Fatal complication';h.medicalCase=null;h.brood=false;h.autoTrain=false;h.autoRace=false;h.autoRaceStatus='Deceased; registration off.';event(w,'life',`${h.name} died following a serious medical complication. Their history and family records are preserved.`,h.id);}
  return m;
}
export function vet(w,horseId,action='examine') {
  const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('A live horse is required.');
  const m=w.medical.find(x=>x.id===h.medicalCase);
  if(action==='rehab'&&!m)throw Error('No medical case requires rehabilitation.');
  if(action==='clear'&&m?.decision==='pending')throw Error('Choose a treatment or retirement plan before return clearance.');
  if(action==='clear'&&m&&m.ceiling<80)throw Error('Permanent racing restriction: discuss comfort care and retirement.');
  if(action==='clear'&&(h.therapy?.status==='active'||m&&(w.day<m.recoveryDay||h.soundness<RULES.minRaceSoundness)))throw Error('Recovery is incomplete; a clearance cannot bypass the medical plan.');
  charge(w,h,action==='rehab'?RULES.rehabFee:RULES.vetFee,'Veterinary service',h.id);
  if(action==='rehab'){m.decision='treat_return';m.decisionDay??=w.day;m.rehab=true;m.therapyStart??=w.day;m.therapyEnd=Math.max(m.recoveryDay,w.day+180);h.clearance='Controlled Light Work';}
  if(action==='clear'&&m){m.status='cleared';h.medicalCase=null;h.clearance=h.status==='retired'?'Light Work':'Race-Cleared';}
  if(action==='clear'&&!m&&h.soundness<80)throw Error('Soundness remains below racing clearance.');
  if(action==='clear'&&!m)h.clearance=h.status==='retired'?'Light Work':'Race-Cleared';
  if(h.youngstock?.newbornCheck==='Recommended')h.youngstock.newbornCheck='Professional newborn assessment completed';
  const report=m?`${m.diagnosis}: ${m.severity}; ${h.soundness.toFixed(1)} soundness; ${h.clearance}. Follow-up day ${m.followUp}.`:`No active medical case. Soundness ${h.soundness.toFixed(1)}, hoof health ${h.hoofHealth.toFixed(1)}. ${h.clearance}.`;
  w.visits.push({id:id(w,'visit'),horseId:h.id,day:w.day,type:'vet',action,report});event(w,'medical',`${h.name}: ${action}. ${report}`,h.id);
}
export function farrier(w,horseId,shoe='Standard') {
  const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('A live horse is required.');
  if(!['Standard','Turf grip','Dirt plate','Barefoot'].includes(shoe))throw Error('Choose supported shoeing.');
  if(h.lastFarrier===w.day)throw Error('Hoof care already completed today.');
  charge(w,h,RULES.farrierFee,'Farrier',h.id);h.hoofHealth=clamp(h.hoofHealth+15*(1+(traitModifiers(h,{phase:'farrier'}).values.farrier||0))+(w.staff.find(s=>s.owner===h.owner&&s.role==='Farrier')?.skill||0)/30);h.farrierDue=w.day+RULES.farrierCycle;h.lastFarrier=w.day;h.shoes=shoe;
  const report=`Hooves inspected and balanced; ${shoe}; next visit in ${RULES.farrierCycle} days. Cooperation ${Math.round((h.temperament+100-h.spookiness+h.skills.handling)/3)}/100.`;
  w.visits.push({id:id(w,'visit'),horseId:h.id,day:w.day,type:'farrier',report});event(w,'farrier',`${h.name}: ${report}`,h.id);
}
export function retire(w,horseId,breeding=true) {
  const h=ownedHorse(w,horseId);if(h.status==='deceased')throw Error('This horse is deceased.');if(h.status==='retired')throw Error('Already retired.');
  h.status='retired';h.retiredDay=w.day;h.brood=breeding&&h.sex!=='gelding';h.autoTrain=false;h.autoRace=false;h.autoRaceStatus='Retired; automatic registration off.';scratchEntries(w,h,'permanent retirement');event(w,'life',`${h.name} retired from racing${h.brood?' for breeding':''}.`,h.id);
}
export function exposure(w,h,context) {
  if(h.medicalCase||h.status==='deceased'||h.exposureDay===w.day)return;h.exposureDay=w.day;
  const healthMods=traitModifiers(h,{phase:'health'}).values;const risk=RULES.injuryRisk*(1-(healthMods.soundness||0)*3)*w.settings.injuryFrequency*racingYearsRisk(h)*(1+h.fatigue/25+(100-h.hoofHealth)/20)*(context==='race'?5:context==='training'?2:1);
  if(random(w)<risk){const type=chooseInjury(w,context,random);return injure(w,h,type.severity,type.label,context,type.id);}
  return null;
}
export function train(w,h,manual=false,activity=null) {
 if(h.status==='deceased'||h.lastTrainingDay===w.day||h.lastRaceDay===w.day||h.travelState==='InTransit')return false;
 if(h.youngstock&&h.status==='active'&&!h.medicalCase&&!(h.breakPlan&&!['Complete','Fitness Rebuild'].includes(h.breakPlan.stage))){
  if(chronologicalDays(h,w.day)<720)return educationSession(w,h);
  if(h.youngstock.starting.status==='not_started'){
   if(!h.autoTrain)return educationSession(w,h);
   if(startingBlocker(w,h))return false;
   createStartingPlan(w,h,h.youngstock.starting.pace);
  }
  if(h.youngstock.starting.status!=='complete')return startingSession(w,h);
 }
 const young=age(h,w.day)<2,restricted=!!h.medicalCase||h.status==='retired'||h.therapy?.status==='active'||h.clearance==='Controlled Light Work'||h.breakPlan&&!['Complete','Fitness Rebuild'].includes(h.breakPlan.stage);
 if(h.clearance==='No Work'||restricted&&!manual&&!h.autoTrain)return false;
 let workout=activity||h.trainingPlan||'Auto Balanced';
 if(h.breakPlan?.stage==='Fitness Rebuild')workout='Reconditioning';
 if(young)workout='Youngstock groundwork';if(restricted)workout='Light exercise';
 if(!WORKOUTS[workout])throw Error('Unknown training activity.');
 if(!young&&!restricted&&(h.soundness<80||h.fatigue>55||h.arrivalDay>w.day||h.pregnancy))return false;
 if((scheduleIndex(w).horseBookings.get(h.id)||[]).some(b=>b.day-w.day<=2))return false;
 if(workout==='Auto Balanced'){
  const candidates=Object.keys(WORKOUTS).filter(k=>!['Auto Balanced','Rest','Light exercise','Youngstock groundwork'].includes(k));
  const ceilings=Object.fromEntries(SKILLS.map(key=>[key,usableCeiling(h,key,w.day)])),scores=Object.fromEntries(candidates.map(name=>[name,WORKOUTS[name].primary.reduce((n,key)=>n+Math.max(0,ceilings[key]-h.skills[key])/Math.max(1,h.potential[key]),0)/Math.max(1,WORKOUTS[name].primary.length)]));
  const specialist=h.distance<=1600?'Sprint work':'Extended gallop';
  workout=[1,2,5].includes(w.day%8)&&scores[specialist]>.04?specialist:candidates.sort((a,b)=>scores[b]-scores[a]||(h.workoutCounts[a]||0)-(h.workoutCounts[b]||0))[0];
 }
 const plan=WORKOUTS[workout];if(age(h,w.day)<plan.minAge)return false;
 const modifiers=traitModifiers(h,{phase:'training'}),trainer=w.staff.find(s=>s.owner===h.owner&&s.role==='Trainer'),quality=trainer?(.85+trainer.skill/300):1,changes=[];
 const keys=[...plan.primary,...plan.secondary];
 for(const key of keys){const before=h.skills[key],ceiling=usableCeiling(h,key,w.day),headroom=Math.max(0,ceiling-before),scale=plan.primary.includes(key)?1:.35;
  const gain=restricted?0:RULES.trainingGain*scale*quality*MOOD_FACTORS[h.mood]*(1-h.fatigue/150)*(h.soundness/100)*(1+(modifiers.values.learning||0))*(.8+h.skills.trainability/250+(modifiers.values.handling||0)*.5)*(headroom/Math.max(1,ceiling));
  if(headroom>0)h.skills[key]=Math.min(ceiling,before+Math.max(0,gain));
  const change=h.skills[key]-before;changes.push({skill:key,before,after:h.skills[key],gain:change,usableCeiling:ceiling,status:headroom<.5?'Maintenance / near current ceiling':ceiling<h.potential[key]?'Maturity or safe functional limit':'Developing'});
  h.development.lastProgress[key]=w.day;h.workoutCounts[key]=(h.workoutCounts[key]||0)+1;
  if(headroom<.5)h.development.plateaus[key]=(h.development.plateaus[key]||0)+1;
 }
 h.workoutCounts[workout]=(h.workoutCounts[workout]||0)+1;h.fatigue=clamp(h.fatigue+plan.fatigue*(young?.5:1));h.fitness=clamp(h.fitness+(restricted?.015:workout==='Rest'?-.03:.3));
 if(!restricted&&!young&&plan.fatigue>0)useRacingYears(w,h,plan.fatigue/13/360);h.lastTrainingDay=w.day;const primary=changes[0]||{skill:'handling',gain:0};
 const session={id:id(w,'session'),horseId:h.id,day:w.day,skill:primary.skill,gain:primary.gain,activity:workout,changes,fatigue:h.fatigue,appliedTraits:modifiers.applied,report:changes.length?changes.map(c=>`${SKILL_DEFINITIONS[c.skill].label} ${c.gain>0?'+':''}${c.gain.toFixed(3)} (${c.status})`).join('; '):'Appropriate light maintenance; no competitive skill gain.'};
 if(h.owner==='player'||w.settings.debug)w.sessions.push(session);else w.sessions.push({id:session.id,horseId:h.id,day:w.day,skill:primary.skill,gain:primary.gain,activity:workout,changes:changes.map(c=>[c.skill,c.before,c.after,c.usableCeiling,c.status]),fatigue:h.fatigue});if(workout==='Gate schooling')observeTrait(w,h,'gate',session.id);if(workout==='Travel practice')observeTrait(w,h,'travel',session.id);if(!restricted)exposure(w,h,'training');return true;
}
export function dailyCare(w,h) {
  if(h.status==='deceased'||h.owner==='archive')return;
  recoveryDay(w,h);
  if(age(h,w.day)>12)h.fitness=clamp(h.fitness-.01*(age(h,w.day)-12));
  h.fatigue=clamp(h.fatigue-(RULES.restRecovery*(.8+h.skills.recovery/250)*(1+(traitModifiers(h,{phase:'care'}).values.recovery||0))));
  const warnings=feedWarnings(h,w.day);h.acuteStress=warnings.length>=2?'Care incompatibility':h.fatigue>70?'Excessive workload':null;
  h.condition=clamp(h.condition+(traitModifiers(h,{phase:'care'}).values.condition||0)*.05+(h.feed==='Weight Gain'?.008:h.feed==='High Energy'?.004:(5-h.condition)*.002),1,9);
  if(w.day>h.farrierDue)h.hoofHealth=clamp(h.hoofHealth-.18*(1-(traitModifiers(h,{phase:'care'}).values.hoof||0)*3));
  const m=w.medical.find(x=>x.id===h.medicalCase);
  if(m&&m.status==='active'){
    const specialist=w.staff.find(s=>s.owner===h.owner&&s.role==='Veterinarian');h.soundness=Math.min(h.potentialSoundnessCeiling??m.ceiling,h.soundness+(m.decision==='pending'?.025:m.rehab?.16:.055)*(specialist?1+specialist.skill/500:1)*(1+(traitModifiers(h,{phase:'vet'}).values.veterinary||0)));
    if(w.day>=m.recoveryDay&&m.decision!=='pending'&&(h.status==='retired'||m.decision==='treat_comfort')){m.status='closed';m.outcome='Comfort-care recovery reviewed';h.medicalCase=null;h.clearance='Light Work';event(w,'medical',`${h.name}: comfort care reviewed; racing clearance has not been granted.`,h.id);}
    if(w.day>=m.recoveryDay&&m.ceiling<80&&h.status!=='retired'&&m.status==='active'){
      h.clearance='Light Work';if(h.owner!=='player'){h.status='retired';h.brood=h.sex!=='gelding';h.autoTrain=false;m.status='closed';h.medicalCase=null;}
      if(!m.retirementNotified){m.retirementNotified=true;event(w,'medical',`${h.name}: permanent racing restriction; retirement and aftercare are recommended.`,h.id);}
    }
    if(w.day>=m.followUp){m.followUp+=30;event(w,'medical',`${h.name}: follow-up review due; current soundness ${h.soundness.toFixed(1)}.`,h.id);}
    if(m.status==='active'&&m.decision!=='pending'&&w.day>=m.recoveryDay&&h.soundness>=80&&h.autoVet){try{vet(w,h.id,'clear');}catch{/* Budget shortage leaves restriction in place. */}}
  }
  if(h.autoFarrier&&w.day>=h.farrierDue){try{farrier(w,h.id,h.shoes||'Standard');}catch{/* Budget shortage leaves hoof-care due. */}}
  if(w.settings.operatingCosts&&h.autoCare){try{charge(w,h,'2000','Daily care',h.id);}catch{h.acuteStress='Care payment overdue';}}
  if(w.day%30===0){
    const negative=warnings.length+(h.fatigue>55?2:0)+(h.soundness<70?1:0)+(traitModifiers(h,{phase:'care'}).values.turnout?1:0);
    const pool=negative>=2?['Distress','Uncomfortable','No Energy',h.preferredMood]:negative?['Uncomfortable','Overly-Active','Neutral',h.preferredMood]:['Happy','Happy','Motivated','Try-Hard','Neutral','Neutral',h.preferredMood,'Grumpy','Bad Mood'];
    h.mood=pick(w,pool);event(w,'mood',`${h.name}: monthly mood ${h.mood}${warnings.length?'. '+warnings.join(' '):'; care and recovery reviewed.'}`,h.id);
  }
}
export function scheduledTraining(w,h) {
  if(!h.autoTrain&&!(h.youngstock?.autoEducation&&chronologicalDays(h,w.day)<720))return 'Off';
  if(h.lastTrainingDay===w.day)return 'Already completed today';
  if(w.day%4===0)return 'Scheduled rest day';
  if(h.clearance==='No Work')return 'Paused for veterinary restriction';
  return train(w,h)?'Completed today':'Paused for fatigue, travel, age or race preparation';
}

// Read-only explanation shared by the daily table and automation.
export function trainingStatus(w,h){
 if(h.status==='deceased')return 'Deceased; career archived';
 if(h.medicalCase)return `Veterinary restriction: ${w.medical.find(m=>m.id===h.medicalCase)?.diagnosis||'assessment required'}`;
 if(h.lastTrainingDay===w.day)return 'Completed today';
 if(!h.autoTrain&&!(h.youngstock?.autoEducation&&chronologicalDays(h,w.day)<720))return 'Program off';
 if(w.day%4===0)return 'Scheduled rest day';
 if(h.clearance==='No Work')return 'Paused for veterinary restriction';
 if(h.soundness<80&&h.status==='active')return 'Below safe training soundness; follow veterinary plan.';
 if(h.fatigue>55)return 'Rest needed for fatigue';
 const p=h.youngstock?.starting;
 if(p&&chronologicalDays(h,w.day)>=720&&p.status!=='complete'){
  if(p.status==='paused')return 'Starting paused — resume the starting plan';
  const reason=startingBlocker(w,h);if(reason)return reason;
  return p.status==='not_started'?'Auto starting will begin on the next eligible session':`Starting ${p.step}/10 — ${p.milestones[p.step]?.name}`;
 }
 return 'Awaiting eligible daily session';
}

export function medicalDecision(w,horseId,choice){
 const h=ownedHorse(w,horseId),m=w.medical.find(m=>m.id===h.medicalCase&&m.status==='active');
 if(!m||h.status==='deceased')throw Error('No active injury needs a care decision.');
 if(!['treat_return','treat_comfort','retire','retire_breeding'].includes(choice))throw Error('Choose treatment, comfort care or retirement.');
 if(m.decision===choice)throw Error('This care plan is already active.');
 if(choice==='treat_return'&&(m.ceiling<80||h.status==='retired'))throw Error('A racing return is not medically available. Choose comfort care or retirement.');
 const retiring=choice.startsWith('retire');if(retiring&&h.status==='retired')throw Error('Already retired; choose comfort care.');
 charge(w,h,RULES.rehabFee,'Injury treatment plan',m.id);
 if(m.decision==='pending')m.recoveryDay=Math.max(m.recoveryDay,w.day+integer(w,m.minDays,m.maxDays));
 m.decision=choice;m.decisionDay=w.day;m.rehab=true;m.therapyStart??=w.day;h.clearance='No Work';
 if(retiring)retire(w,h.id,choice==='retire_breeding');
 event(w,'medical',`${h.name}: ${choice==='treat_return'?'treat and reassess for racing':choice==='treat_comfort'?'comfort-care treatment':'retirement with continuing aftercare'} selected. Recovery estimate ${m.minDays}–${m.maxDays} days; return is never guaranteed.`,h.id);
 return m;
}
