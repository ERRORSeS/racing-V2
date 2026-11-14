import { racingWindowReason } from './durability.js';
import { settleV7Race } from './v7.js';
import { changeFatigue } from './fatigue.js';
import { useRacingYears } from './racing-years.js';
import { ensureJockeys, addCircuitReserves } from './circuit-reserves.js';
import { qualificationReason, commitQualification } from './championships.js';
import { formFactor, recordForm } from './form.js';
import { raceEducationBlocker } from './youngstock.js';
import { scheduleIndex, reserveInIndex, invalidateSchedule } from './reservations.js';
import { updateRecords } from './legacy.js';
import { publishRace } from './media.js';
import { usableCeiling } from './development.js';
import { traitModifiers } from './traits.js';
import { bookTravel } from './travel.js';
import { RACE_CLASSES, classLabel, classDefinition, conditionsFor, carriedWeight, observedRating, FIELD_DENSITY } from './race-rules.js';
import { RULES, COUNTRIES, TACTICS, MOOD_FACTORS, age, clamp } from './rules.js';
import { integer, pick, random, id } from './random.js';
import { event, transact, charge, ownedHorse } from './core.js';
import { career } from './career.js';
import { exposure } from './care.js';

export { renewCalendar as schedule } from './race-catalog.js';
export function eligibility(w,h,f,options={}) {
  if(!h||!f)return 'Choose a horse and fixture.';
  if(f.status!=='scheduled'||f.day<w.day)return 'This race is closed.';
  const educationReason=raceEducationBlocker(w,h,f);if(educationReason)return educationReason;
  const windowReason=racingWindowReason(w,h,f.day);if(windowReason)return windowReason;
  if(h.status!=='active')return 'This horse is permanently retired or deceased.';
  if(h.medicalCase||h.clearance!=='Race-Cleared'||h.soundness<RULES.minRaceSoundness)return 'Veterinary clearance required.';
  if(h.hoofHealth<65)return 'Hoof care is required before entry.';
  if(h.fatigue>RULES.maxRaceFatigue)return 'Fatigue is too high.';
  if(h.pregnancy||h.postFoalingUntil>f.day)return 'Pregnancy or post-foaling rest prevents racing.';
  if(age(h,f.day)<f.minAge||age(h,f.day)>f.maxAge)return `Race age restriction: ${f.minAge}–${f.maxAge}.`;
  if(h.registryEligibility==='ineligible'||(h.registryEligibility==='alternative'&&w.settings.registryMode!=='alternative'))return 'Registration does not permit this entry.';
  const qualified=qualificationReason(w,h,f);if(qualified)return qualified;
  if(w.travel?.some(t=>t.horseId===h.id&&['Reserved','InTransit','Acclimatizing'].includes(t.status)&&t.destination!==f.country&&f.day>=t.departureDay))return 'An active journey is taking this horse to another country.';
  if(h.arrivalDay>f.day||(h.location!==f.country&&!w.travel?.some(t=>t.horseId===h.id&&t.destination===f.country&&t.readyDay<=f.day&&['Reserved','InTransit','Acclimatizing'].includes(t.status)&&t.id===h.activeTransport)))return 'Transport this horse to the race country first.';
  if(f.day<=w.day&&(h.location!==f.country||h.arrivalDay>w.day||['InTransit','Reserved','Acclimatizing'].includes(h.travelState)))return 'Late arrival or acclimatization incomplete at race-day checks.';
  const conditions=f.conditions||{};
  if(h.breakPlan&&h.breakPlan.stage!=='Complete')return 'Horse is on a break or return-to-work review.';
  if(conditions.sex&&conditions.sex!=='open'&&h.sex!==conditions.sex)return 'Sex-restricted race.';
  const wins=career(h).wins,rating=observedRating(h);
  if(conditions.maxWins!=null&&wins>conditions.maxWins)return 'Win restriction exceeded.';
  const maiden=f.classId==='maiden'||f.grade==='Maiden',minimum=conditions.minPlacings??(!maiden?conditions.minWins:null),top3=career(h).wins+career(h).seconds+career(h).thirds;
  if(minimum!=null&&top3<minimum)return `Published minimum ${minimum} top-three finishes not met.`;
  if(maiden&&conditions.minWins!=null&&wins<conditions.minWins)return 'Published minimum wins not met.';
  if(conditions.minRating!=null&&(rating==null||rating<conditions.minRating))return 'Official handicap rating below range or not established.';
  if(conditions.maxRating!=null&&rating!=null&&rating>conditions.maxRating)return 'Official handicap rating above range.';
  if(conditions.bredIn&&h.country!==conditions.bredIn)return 'Birth-jurisdiction restriction.';
  if(age(h,f.day)===2&&f.distance>2000)return 'Distance is restricted to mature runners.';
  if(f.grade==='Maiden'&&career(h).wins>0)return 'Maiden races are for horses without a win.';
  if(h.lastRaceDay!=null&&f.day-h.lastRaceDay<RULES.minRaceRest)return 'At least five days recovery between races.';
  if((f.entries||[]).some(e=>e.horseId===h.id))return 'Already entered.';
  if((f.entries||[]).length>=f.maxRunners)return 'Field is full.';
  if(!options.ignoreBookings&&(scheduleIndex(w).horseBookings.get(h.id)||[]).some(b=>b.fixtureId!==f.id&&Math.abs(b.day-f.day)<RULES.minRaceRest))return 'Conflicting race or recovery period.';
  if(f.country==='Japan'&&h.gear.accessory==='Hood')return 'Hood is restricted by this simulated jurisdiction.';
  return null;
}
export function enterRace(w,fixtureId,horseId,jockeyId,tactic='stalk') {
  const h=ownedHorse(w,horseId),f=w.fixtures.find(x=>x.id===fixtureId);if(f&&h.location!==f.country&&h.autoTravel&&!w.travel.some(t=>t.id===h.activeTransport&&t.destination===f.country))bookTravel(w,h.id,f.country,f.id);const reason=eligibility(w,h,f);if(reason)throw Error(reason);
  const j=w.jockeys.find(x=>x.id===jockeyId);if(!j||!TACTICS.includes(tactic))throw Error('Choose a jockey and valid tactic.');
  if(scheduleIndex(w).jockeyBookings.has(`${j.id}:${f.day}`))throw Error('Jockey already booked that day.');
  const total=BigInt(f.fee)+BigInt(j.fee);transact(w,-total,'Race entry and jockey booking',f.id);
  const entry={horseId:h.id,owner:h.owner,jockeyId:j.id,tactic,carriedWeight:carriedWeight(h,f),gear:structuredClone(h.gear),fee:total.toString()};f.entries.push(entry);reserveInIndex(w,f,entry);event(w,'racing',`${h.name} entered in ${f.title}, ${f.country}, ${f.distance}m ${f.surface}; ${j.name}, ${tactic}.`,h.id);
}
export function scratchRace(w,fixtureId,horseId) {
  ownedHorse(w,horseId);const f=w.fixtures.find(x=>x.id===fixtureId);if(!f||f.status!=='scheduled')throw Error('Race is no longer open.');
  const e=f.entries.find(x=>x.horseId===horseId);if(!e)throw Error('No entry to scratch.');f.entries=f.entries.filter(x=>x!==e);invalidateSchedule(w);event(w,'racing',`${w.horses[horseId].name} withdrawn from ${f.title}. Voluntary withdrawal fees retained.`,horseId);
}
export function travel(w,horseId,country,options={}){return bookTravel(w,horseId,country,null,false,options);}
export function autoField(w,f,target=null) {
  const goal=Math.min(f.maxRunners,target??f.targetFieldSize??RULES.fieldSize);if(f.entries.length>=goal)return;ensureJockeys(w,f,goal-f.entries.length);
  const candidates=scheduleIndex(w).npcHorses.filter(h=>!eligibility(w,h,f));
  candidates.sort((a,b)=>b.fitness-a.fitness||a.id.localeCompare(b.id));
  for(const h of candidates){if(f.entries.length>=Math.min(f.maxRunners,target??f.targetFieldSize??RULES.fieldSize))break;
    const available=w.jockeys.filter(j=>!scheduleIndex(w).jockeyBookings.has(`${j.id}:${f.day}`));
    if(!available.length)break;const j=available[integer(w,0,available.length-1)];
    try{charge(w,h,(BigInt(f.fee)+BigInt(j.fee)).toString(),'Race entry',f.id);}catch{continue;}
    const entry={horseId:h.id,owner:h.owner,jockeyId:j.id,tactic:pick(w,TACTICS),carriedWeight:carriedWeight(h,f),gear:structuredClone(h.gear)};f.entries.push(entry);reserveInIndex(w,f,entry);
  }
}
function reassignNpcReserves(w,f){
 if(!f.qualification&&f.conditions?.minRating==null)return;
 for(const h of scheduleIndex(w).npcHorses){
  if(f.entries.length>=(f.minStarters||2))break;
  if(eligibility(w,h,f,{ignoreBookings:true}))continue;
  const clashes=w.fixtures.filter(other=>other.id!==f.id&&other.status==='scheduled'&&Math.abs(other.day-f.day)<RULES.minRaceRest&&other.entries.some(e=>e.horseId===h.id));
  if(!clashes.length||clashes.some(other=>other.isAnnualMajor||other.qualification||other.entries.length<=(other.minStarters||2)))continue;
  for(const other of clashes)other.entries=other.entries.filter(e=>e.horseId!==h.id);
  invalidateSchedule(w);event(w,'racing',`${h.name} reassigned by its NPC stable to ${f.title}; other fields retain their minimum runners.`,h.id);autoField(w,f,f.entries.length+1);
 }
}
export function resolveRace(w,fixtureId) {
  const f=w.fixtures.find(x=>x.id===fixtureId);if(!f)throw Error('Unknown fixture.');
  if(f.resultId)return w.results[f.resultId];
  if(f.status!=='scheduled'||f.day>w.day)throw Error('Race is not due.');
  // Revalidate booked entries without treating their own booking as a clash.
  const booked=f.entries;f.entries=[];invalidateSchedule(w);
  for(const e of booked){const h=w.horses[e.horseId],reason=eligibility(w,h,f);if(reason){if(e.owner==='player'&&e.fee)transact(w,BigInt(e.fee),'Welfare scratch refund',f.id);event(w,'racing',`${h.name} scratched from ${f.title}: ${reason}`,h.id);}else{f.entries.push(e);reserveInIndex(w,f,e);}}
  autoField(w,f);if(f.entries.length<(f.minStarters||2))reassignNpcReserves(w,f);if(f.entries.length<(f.minStarters||2)){addCircuitReserves(w,f,(f.targetFieldSize||8)-f.entries.length);autoField(w,f);}
  if(f.entries.length<(f.minStarters||2)){f.day=w.day+7;f.phase='Rescheduled';f.reschedules=(f.reschedules||0)+1;f.delayReason='Awaiting enough legally eligible, sound runners; entry fees and nominations retained.';invalidateSchedule(w);event(w,'racing',`${f.title} moved seven days: awaiting an eligible field. Existing nominations and fees retained.`);return null;}
  f.status='running';f.phase='Running';
  f.fieldSnapshot={day:w.day,entries:structuredClone(f.entries)};
  const runners=f.entries.map((e,index)=>{
    const h=w.horses[e.horseId],j=w.jockeys.find(x=>x.id===e.jockeyId),values=Object.fromEntries(Object.keys(h.skills).map(k=>[k,Math.min(h.skills[k],usableCeiling(h,k,w.day))]));
    const familiarity=h.starts.filter(s=>s.jockeyId===j.id).length,mods=traitModifiers(h,{phase:'race',tactic:e.tactic,surface:f.surface,distance:f.distance,going:f.going,course:f.course,temperature:f.temperature,inPack:index>0,familiarJockey:familiarity>2});
    const surface=(.92+(values[f.surface]||50)/1000)*(1+(mods.values[f.surface]||0)+(mods.values.surface||0)),dist=1-Math.min(.15,Math.abs(h.distance-f.distance)/15000);
    const aptitude=(12.5+values.speed*.068)*surface*dist*(.96+values.muscle*.0004)*(.94+h.fitness*.0006)*(e.gear.fit<70?.97:1)*(1+(mods.values.tack||0))*(.94+h.soundness*.0006)*MOOD_FACTORS[h.mood]*(1-h.fatigue*.0007)*(h.acuteStress?.97:1)*(1-Math.abs(h.condition-5)*.006)*(1-((e.carriedWeight||56)-56)*.002);
    const experience=Math.min(5,h.starts.length*.1);const gate=clamp((experience+values.gate+j.start+(100-h.spookiness)+values.confidence*.2)/3.2+(mods.values.gate||0)*100)/100;
    const formVariation=formFactor(w,h,f.id);
    return {e,h,j,values,mods,familiarity,flags:new Set(),formVariation,gate:index+1,distance:0,currentSpeed:0,energy:100,time:null,splits:[],speed:aptitude*formVariation,delay:(1-gate)*.8+(1-values.breakReaction/100)*.3,stamina:values.stamina};
  });
  const raceEvents=[];
  function incident(r,type,time,effects,text){raceEvents.push({id:`race-event-${f.id}-${raceEvents.length+1}`,fixtureId:f.id,horseId:r.h.id,time,distance:r.distance,type,effects,text,severity:'minor'});}
  for(const r of runners)if(r.delay>.45)incident(r,'slowBreak',0,{delaySeconds:r.delay},`${r.h.name} is slow to respond at the gates, losing ${r.delay.toFixed(2)} seconds.`);
  const frames=f.historical?[]:[{time:0,stage:'Starting Gates',positions:runners.map(r=>({horseId:r.h.id,distance:0,energy:100,speed:0}))}],stages=new Set(),dt=f.historical?5:.5;let clock=0;
  while(runners.some(r=>r.time===null&&!r.pulled)&&clock<600){
    clock+=dt;const order=[...runners].sort((a,b)=>b.distance-a.distance);
    for(const r of runners){if(r.time!==null||r.pulled||clock<r.delay)continue;
      if(!f.historical&&r.distance>=f.distance*.45&&!r.flags.has('medical-check')){r.flags.add('medical-check');const medical=exposure(w,r.h,'race');if(medical){r.pulled=true;r.currentSpeed=0;r.medical=medical;incident(r,'pulledUp',clock,{medicalCase:medical.id,outcome:'Pulled up'},`${r.h.name} is pulled up for veterinary assessment: ${medical.diagnosis}.`);continue;}}
      const fraction=r.distance/f.distance,early=fraction<.60;
      const m=r.mods.values,v=r.values;
      const style=1+(m[r.e.tactic]||0);
      const fidelity=.4+(v.tactical+v.adaptability)/333;
      const rawTactical=r.e.tactic==='front'?(early?1.035:.970):r.e.tactic==='pace'?(early?1.018:.990):r.e.tactic==='close'?(early?.965:1.045):1;
      const tactical=1+(rawTactical-1)*fidelity;
      const kick=fraction>.8&&r.energy>10?1+v.kick/2500+(m.finish||0):1;
      const position=order.indexOf(r),blocked=position>0&&order[position-1].distance-r.distance<2&&fraction>.25&&fraction<.85;
      const traffic=blocked?.96+v.traffic*.0003+(m.traffic||0)*.2:1;
      if(blocked&&!r.flags.has('boxed')){r.flags.add('boxed');incident(r,'boxedIn',clock,{paceMultiplier:traffic},`${r.h.name} meets a crowded passage; available pace is reduced until room opens.`);}
      const inTurn=f.course?.turns>0&&fraction>.55&&fraction<.75,turn=inTurn?.96+v.cornering*.0004+(m.cornering||0)+(m[f.course.direction]||0):1;
      const wide=inTurn&&(r.h.traits.includes('Wide Runner')||v.cornering<35)? .985:1;
      if(wide<1&&!r.flags.has('wide')){r.flags.add('wide');incident(r,'wideRun',clock,{distanceEfficiency:wide},`${r.h.name} takes a wider line around the bend.`);}
      const duel=early&&r.e.tactic==='front'&&order.slice(0,2).filter(x=>x.e.tactic==='front').length===2;
      if(duel&&!r.flags.has('duel')){r.flags.add('duel');incident(r,'paceDuel',clock,{energyMultiplier:1.12},`${r.h.name} contests the early lead, using additional reserves.`);}
      if(kick>1.02&&!r.flags.has('kick')){r.flags.add('kick');incident(r,'lateKick',clock,{paceMultiplier:kick,remainingEnergy:r.energy},`${r.h.name} uses remaining reserves for a late acceleration.`);}
      const attention=1-((100-v.focus)/100)*.007,pressure=1-((100-v.composure)/100)*Math.min(.02,runners.length*.001)-(m.stress||0)*.4-(m.composure||0)*-.2,stride=.98+v.stride*.0003+(m.stride||0),balance=blocked?.98+v.balance*.0002:1;
      const finishSkill=early?r.j.pace:r.j.finish,fatigue=1-Math.max(0,30-r.energy)*.004;
      const going=f.going==='soft'?.93+v.wet*.0007+(m.soft||0)+(m.hill||0):1+(m.firm||0);
      const target=clamp(r.speed*tactical*style*kick*traffic*turn*wide*attention*pressure*stride*balance*going*fatigue*(.98+finishSkill*.0004)*(1+Math.min(.012,r.familiarity*.001)+(m.familiarity||0))*(1+(random(w)-.5)*.035),5,22);
      r.currentSpeed=Math.min(target,r.currentSpeed+dt*(.8+v.acceleration/30)*(1+(m.acceleration||0)));
      const pace=r.currentSpeed;
      const before=r.distance;r.distance+=pace*dt;
      r.energy-=dt*(.65+(tactical-1)*7+(m.paceVariance||0))*(1.2-r.stamina/250)*(1.15-v.aerobic/500)*(1.12-v.cruising/500)*(1.1-v.paceControl/700)*(duel?1.12:1)*(1-(m.energy||0)-(m.cruising||0));
      for(const split of [400,800,1200,1600,2000,2400,2800,3200])if(split<=f.distance&&before<split&&r.distance>=split)r.splits.push({meters:split,time:clock-dt+(split-before)/(pace)});
      if(r.distance>=f.distance)r.time=clock-dt+(f.distance-before)/pace;
    }
    const lead=Math.max(...runners.map(r=>r.distance)),stage=lead>=f.distance?'Finish':lead>=f.distance-200?'Last 200m':lead>=f.distance*.75?'Final Turn':lead>=f.distance*.5?'Halfway':lead>=f.distance*.25?'Early Running':'Break',newStage=!stages.has(stage);stages.add(stage);
    if(!f.historical&&(newStage||Math.round(clock*2)%20===0||runners.every(r=>r.time!==null||r.pulled)))frames.push({time:clock,stage,positions:[...runners].sort((a,b)=>a.time!==null&&b.time!==null?a.time-b.time:a.time!==null?-1:b.time!==null?1:b.distance-a.distance).map(r=>({horseId:r.h.id,distance:Math.min(f.distance,r.distance),energy:r.energy,speed:r.currentSpeed}))});
  }
  runners.sort((a,b)=>(a.time===null)-(b.time===null)||(a.time!==null?a.time-b.time:b.distance-a.distance)||a.gate-b.gate);
  const resultId=id(w,'result'),rows=runners.map((r,i)=>{
    const prize=r.time===null?'0':(BigInt(f.purse)*BigInt(Math.round((RULES.purseShares[i]||0)*100))/100n).toString();
    return {readiness:{status:r.h.youngstock?.starting.status||'complete',completedDay:f.historical?r.h.born+720:r.h.youngstock?.starting.completedDay??w.day,clearance:'Race-Cleared',medicalCase:null,origin:f.historical?'generated_founder_history':'live pre-race check'},horseId:r.h.id,name:r.h.name,owner:r.e.owner,jockeyId:r.j.id,jockeyName:r.j.name,place:r.time===null?null:i+1,outcome:r.time===null?'Pulled up':'Finished',time:r.time,margin:r.time===null?null:(r.time-runners[0].time)*16/2.4,prize,gate:r.gate,tactic:r.e.tactic,carriedWeight:r.e.carriedWeight||56,formVariation:r.formVariation,effectiveSkills:r.values,traitInputs:r.mods.applied,gear:r.e.gear,splits:r.splits};
  });
  const highlights=frames.filter((_,i)=>i===0||i===Math.floor(frames.length/2)||i===frames.length-2).map(frame=>({time:frame.time,text:`${w.horses[frame.positions[0].horseId].name} leads at ${Math.round(frame.positions[0].distance)}m. The field is ${frame.positions.length} strong.`}));
  for(const ev of raceEvents)if(['slowBreak','boxedIn','paceDuel','lateKick','wideRun','pulledUp'].includes(ev.type))highlights.push({time:ev.time,text:ev.text});highlights.sort((a,b)=>a.time-b.time);
  const finishers=rows.filter(row=>row.place!==null);
  highlights.push({time:finishers[0]?.time??clock,text:finishers.length?`${finishers[0].name} wins in ${finishers[0].time.toFixed(2)} seconds.${finishers[1]?` ${finishers[1].name} finishes second, ${finishers[1].margin.toFixed(2)} lengths behind.`:' No other horse finished.'}`:'No finishers; no winner or purse is awarded.'});
  const result={id:resultId,fixtureId:f.id,day:w.day,title:f.title,country:f.country,track:f.track,surface:f.surface,distance:f.distance,going:f.going,grade:f.grade,classId:f.classId,tier:f.tier||0,blackType:!!f.blackType,source:f.historical?'history seeded':'live',historical:!!f.historical,founderArchive:!!f.founderArchive,replayAvailable:!f.historical,events:raceEvents,rows,frames,highlights,incidents:runners.filter(r=>r.medical).map(r=>({horseId:r.h.id,medicalCase:r.medical.id,text:`Pulled up during the race: ${r.medical.diagnosis}; ${r.medical.severity}. Veterinary restrictions applied.`})),key:`${w.seed}:${f.id}:${w.rng}`};
  w.results[resultId]=result;f.resultId=resultId;f.status='completed';f.phase='Settled';
  for(const row of rows){const h=w.horses[row.horseId];h.historyRecorded=true;h.starts.push({resultId,fixtureId:f.id,day:w.day,title:f.title,track:f.track,country:f.country,distance:f.distance,surface:f.surface,going:f.going,grade:f.grade,classId:f.classId,tier:f.tier||0,blackType:!!f.blackType,performanceRating:row.time===null?null:Math.round(clamp(50+(f.distance/row.time-15)*14+((row.carriedWeight||56)-56),0,140)),source:f.historical?'history seeded':'live',...row});recordForm(w,h,h.starts.at(-1));if(!f.historical)useRacingYears(w,h,4/360);h.lastRaceDay=w.day;if(!f.historical)changeFatigue(w,h,{load:25*(1-h.skills.recovery/500),source:'Race'});else h.fatigue=clamp(h.fatigue+25*(1-h.skills.recovery/500));h.fitness=clamp(h.fitness+.5);
    if(!f.historical){if(row.owner==='player')transact(w,BigInt(row.prize),'Race prize',resultId);else w.owners[row.owner].balance=(BigInt(w.owners[row.owner].balance||'0')+BigInt(row.prize)).toString();}
    const j=w.jockeys.find(x=>x.id===row.jockeyId);j.starts++;if(row.place===1)j.wins++;
    event(w,'racing',`${h.name}: ${row.place??'Pulled up'}/${rows.length} in ${f.title}, ${f.distance}m ${f.surface}.`,h.id);
  }
  commitQualification(w,result,f);updateRecords(w,result);publishRace(w,result);settleV7Race(w,result);return result;
}

export function fieldHealth(w,f){
 const rejectionBreakdown={},eligible=[];
 for(const h of scheduleIndex(w).npcHorses){const reason=eligibility(w,h,f);if(reason)rejectionBreakdown[reason]=(rejectionBreakdown[reason]||0)+1;else eligible.push(h.id);}
 const report={day:w.day,currentEntries:f.entries.length,eligibleAvailable:eligible.length,minStarters:f.minStarters||2,targetStarters:f.targetFieldSize||8,maxStarters:f.maxRunners,remainingSlots:Math.max(0,f.maxRunners-f.entries.length),fieldHealth:f.entries.length>=(f.minStarters||2)?'Viable':f.entries.length+eligible.length>=(f.minStarters||2)?'Reserve available':'At risk',rejectionBreakdown,estimatedFieldAtDeclarations:Math.min(f.maxRunners,f.entries.length+eligible.length)};return report;
}
export function planNpcEntries(w){
 for(const f of w.fixtures.filter(f=>f.status==='scheduled'&&f.day>=w.day&&f.day-w.day<=10).sort((a,b)=>((b.isAnnualMajor?100:0)+(b.conditions?.minRating!=null?70:0)+(b.tier||0)*10)-((a.isAnnualMajor?100:0)+(a.conditions?.minRating!=null?70:0)+(a.tier||0)*10)||a.day-b.day)){
   const target=Math.min(f.targetFieldSize||8,f.maxRunners-2);
   if(f.entries.length>=target&&f.day-w.day>1)continue;
   if(f.day-w.day<=2&&f.entries.length<target){autoField(w,f,target);if(f.entries.length<target)addCircuitReserves(w,f,target-f.entries.length);}
   // Keep at least two places open for player nominations before declarations.
   autoField(w,f,Math.min(f.targetFieldSize||8,f.maxRunners-2));
   f.fieldHealth=fieldHealth(w,f);f.phase=f.day-w.day<=1?'DeclarationsClosed':'EntriesOpen';
 }
}
