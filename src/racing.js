import { RULES, COUNTRIES, TACTICS, MOOD_FACTORS, age, clamp } from './rules.js';
import { integer, pick, random, id } from './random.js';
import { event, transact, charge, ownedHorse } from './core.js';
import { career } from './career.js';
import { exposure } from './care.js';

export function schedule(w,start) {
  for(let d=start+3;d<=start+30;d+=6)for(const country of Object.keys(COUNTRIES)){
    const index=Math.floor((d-start)/6),grade=['Maiden','Allowance','Open',`${COUNTRIES[country].grade} 3`,`${COUNTRIES[country].grade} 1`][index%5];
    w.fixtures.push({id:id(w,'fixture'),day:d,country,track:COUNTRIES[country].track,surface:COUNTRIES[country].surface,distance:pick(w,[1200,1600,2000,2400]),title:`${['First Light','Horizon','Meadow','Crown','Meridian'][index%5]} ${grade}`,grade,status:'scheduled',entries:[],minAge:grade.includes(' 1')||grade.includes(' 3')?3:2,maxAge:12,maxRunners:12,purse:grade.includes(' 1')?'150000000':grade.includes(' 3')?'40000000':grade==='Open'?'15000000':grade==='Allowance'?'7500000':'3000000',fee:'10000',going:pick(w,['firm','good','soft']),resultId:null});
  }
}
export function eligibility(w,h,f) {
  if(!h||!f)return 'Choose a horse and fixture.';
  if(f.status!=='scheduled'||f.day<w.day)return 'This race is closed.';
  if(h.status!=='active')return 'This horse is permanently retired or deceased.';
  if(h.medicalCase||h.clearance!=='Race-Cleared'||h.soundness<RULES.minRaceSoundness)return 'Veterinary clearance required.';
  if(h.hoofHealth<65)return 'Hoof care is required before entry.';
  if(h.fatigue>RULES.maxRaceFatigue)return 'Fatigue is too high.';
  if(h.pregnancy||h.postFoalingUntil>f.day)return 'Pregnancy or post-foaling rest prevents racing.';
  if(age(h,f.day)<f.minAge||age(h,f.day)>f.maxAge)return `Race age restriction: ${f.minAge}–${f.maxAge}.`;
  if(h.registryEligibility==='ineligible'||(h.registryEligibility==='alternative'&&w.settings.registryMode!=='alternative'))return 'Registration does not permit this entry.';
  if(f.grade.includes(' 1')&&career(h).wins<3)return 'Top-level races require three recorded wins.';
  if(f.grade.includes(' 3')&&career(h).wins<1)return 'This graded/group race requires a recorded win.';
  if(f.grade==='Maiden'&&career(h).wins>0)return 'Maiden races are for horses without a win.';
  if(h.arrivalDay>f.day||h.location!==f.country)return 'Transport this horse to the race country first.';
  if(h.lastRaceDay!=null&&f.day-h.lastRaceDay<RULES.minRaceRest)return 'At least five days recovery between races.';
  if((f.entries||[]).some(e=>e.horseId===h.id))return 'Already entered.';
  if((f.entries||[]).length>=f.maxRunners)return 'Field is full.';
  if(w.fixtures.some(x=>x.status==='scheduled'&&Math.abs(x.day-f.day)<RULES.minRaceRest&&x.entries?.some(e=>e.horseId===h.id)))return 'Conflicting race or recovery period.';
  if(f.country==='Japan'&&h.gear.accessory==='Hood')return 'Hood is restricted by this simulated jurisdiction.';
  return null;
}
export function enterRace(w,fixtureId,horseId,jockeyId,tactic='stalk') {
  const h=ownedHorse(w,horseId),f=w.fixtures.find(x=>x.id===fixtureId),reason=eligibility(w,h,f);if(reason)throw Error(reason);
  const j=w.jockeys.find(x=>x.id===jockeyId);if(!j||!TACTICS.includes(tactic))throw Error('Choose a jockey and valid tactic.');
  if(w.fixtures.some(x=>x.day===f.day&&x.status==='scheduled'&&x.entries?.some(e=>e.jockeyId===j.id)))throw Error('Jockey already booked that day.');
  const total=BigInt(f.fee)+BigInt(j.fee);transact(w,-total,'Race entry and jockey booking',f.id);
  f.entries.push({horseId:h.id,owner:h.owner,jockeyId:j.id,tactic,gear:structuredClone(h.gear),fee:total.toString()});event(w,'racing',`${h.name} entered in ${f.title}, ${f.country}, ${f.distance}m ${f.surface}; ${j.name}, ${tactic}.`,h.id);
}
export function scratchRace(w,fixtureId,horseId) {
  ownedHorse(w,horseId);const f=w.fixtures.find(x=>x.id===fixtureId);if(!f||f.status!=='scheduled')throw Error('Race is no longer open.');
  const e=f.entries.find(x=>x.horseId===horseId);if(!e)throw Error('No entry to scratch.');f.entries=f.entries.filter(x=>x!==e);event(w,'racing',`${w.horses[horseId].name} withdrawn from ${f.title}. Voluntary withdrawal fees retained.`,horseId);
}
export function travel(w,horseId,country) {
  const h=ownedHorse(w,horseId);if(!COUNTRIES[country])throw Error('Choose a supported destination.');
  if(h.status==='deceased'||h.medicalCase||h.pregnancy)throw Error('Travel is unavailable during medical restriction or pregnancy.');
  if(h.location===country)throw Error('Already at this destination.');
  if(w.fixtures.some(f=>f.status==='scheduled'&&f.entries?.some(e=>e.horseId===h.id)))throw Error('Scratch booked races before transport.');
  charge(w,h,RULES.transportFee,'Transport',h.id);h.location=country;h.arrivalDay=w.day+(w.settings.instantTravel?0:3);h.fatigue=clamp(h.fatigue+(h.traits.includes('Travel Anxiety')?18:8));event(w,'travel',`${h.name} transported to ${country}; arrival day ${h.arrivalDay}.`,h.id);
}
function autoField(w,f) {
  const candidates=Object.values(w.horses).filter(h=>h.owner!=='player'&&h.owner!=='archive'&&!eligibility(w,h,f));
  candidates.sort((a,b)=>b.fitness-a.fitness||a.id.localeCompare(b.id));
  for(const h of candidates){if(f.entries.length>=RULES.fieldSize)break;
    const available=w.jockeys.filter(j=>!w.fixtures.some(x=>x.day===f.day&&x.entries?.some(e=>e.jockeyId===j.id)));
    if(!available.length)break;const j=available[integer(w,0,available.length-1)];
    try{charge(w,h,(BigInt(f.fee)+BigInt(j.fee)).toString(),'Race entry',f.id);}catch{continue;}
    f.entries.push({horseId:h.id,owner:h.owner,jockeyId:j.id,tactic:pick(w,TACTICS),gear:structuredClone(h.gear)});
  }
}
export function resolveRace(w,fixtureId) {
  const f=w.fixtures.find(x=>x.id===fixtureId);if(!f)throw Error('Unknown fixture.');
  if(f.resultId)return w.results[f.resultId];
  if(f.status!=='scheduled'||f.day>w.day)throw Error('Race is not due.');
  // Revalidate booked entries without treating their own booking as a clash.
  const booked=f.entries;f.entries=[];
  for(const e of booked){const h=w.horses[e.horseId],reason=eligibility(w,h,f);if(reason){if(e.owner==='player'&&e.fee)transact(w,BigInt(e.fee),'Welfare scratch refund',f.id);event(w,'racing',`${h.name} scratched from ${f.title}: ${reason}`,h.id);}else f.entries.push(e);}
  autoField(w,f);
  if(f.entries.length<2){f.status='canceled';for(const e of f.entries)if(e.owner==='player'&&e.fee)transact(w,BigInt(e.fee),'Canceled race refund',f.id);event(w,'racing',`${f.title} canceled: insufficient eligible runners.`);return null;}
  f.status='running';
  const runners=f.entries.map((e,index)=>{
    const h=w.horses[e.horseId],j=w.jockeys.find(x=>x.id===e.jockeyId),surface=h.surface===f.surface?1:.965,dist=1-Math.min(.10,Math.abs(h.distance-f.distance)/20000);
    const form=(h.potential.speed*.30+h.skills.speed*.40+h.fitness*.20+h.skills.focus*.10)/100;
    const aptitude=(13.5+form*4.7)*surface*dist*(h.traits.includes('Loves Soft Ground')&&f.going==='soft'?1.018:1)*(e.gear.fit<70?.97:1)*(e.gear.accessory==='Blinkers'?(h.spookiness>65?1.008:h.spookiness<20?.99:1):1)*(.94+h.soundness*.0006)*MOOD_FACTORS[h.mood]*(1-h.fatigue*.0007)*(h.acuteStress?.97:1);
    const gate=clamp((h.skills.gate+j.start+(100-h.spookiness))/3+(h.traits.includes('Bold Starter')?5:0)-(h.traits.includes('Gate Anxious')?7:0))/100;
    const formVariation=1+(random(w)-.5)*.12;
    return {e,h,j,formVariation,gate:index+1,distance:0,energy:100,time:null,splits:[],speed:aptitude*formVariation,delay:(1-gate)*.7+(h.traits.includes('Slow Breaker')?.3:0),stamina:h.potential.stamina*.5+h.skills.stamina*.5};
  });
  const frames=[],dt=.5;let clock=0;
  while(runners.some(r=>r.time===null)&&clock<600){
    clock+=dt;const order=[...runners].sort((a,b)=>b.distance-a.distance);
    for(const r of runners){if(r.time!==null||clock<r.delay)continue;
      const fraction=r.distance/f.distance,early=fraction<.60;
      const style=(r.e.tactic==='front'&&r.h.traits.includes('Front Runner')||r.e.tactic==='close'&&r.h.traits.includes('Patient Closer'))?1.008:1;
      const tactical=r.e.tactic==='front'?(early?1.035:.970):r.e.tactic==='pace'?(early?1.018:.990):r.e.tactic==='close'?(early?.965:1.045):1;
      const kick=!early&&r.h.traits.includes('Strong Finisher')?1.018:1;
      const position=order.indexOf(r),traffic=position>0&&order[position-1].distance-r.distance<2&&fraction>.25&&fraction<.85?.985:1;
      const finishSkill=early?r.j.pace:r.j.finish;
      const fatigue=1-Math.max(0,30-r.energy)*.003;
      const pace=r.speed*tactical*style*kick*traffic*fatigue*(.98+finishSkill*.0004)*(1+(random(w)-.5)*.035)*Math.min(1,.55+clock*.12);
      const before=r.distance;r.distance+=pace*dt;
      r.energy-=dt*(.65+(tactical-1)*7)*(1.2-r.stamina/250);
      for(const split of [400,800,1200,1600,2000,2400])if(split<=f.distance&&before<split&&r.distance>=split)r.splits.push({meters:split,time:clock-dt+(split-before)/(pace)});
      if(r.distance>=f.distance)r.time=clock-dt+(f.distance-before)/pace;
    }
    if(Math.round(clock*2)%20===0||runners.every(r=>r.time!==null))frames.push({time:clock,positions:[...runners].sort((a,b)=>a.time!==null&&b.time!==null?a.time-b.time:a.time!==null?-1:b.time!==null?1:b.distance-a.distance).map(r=>({horseId:r.h.id,distance:Math.min(f.distance,r.distance)}))});
  }
  runners.sort((a,b)=>a.time-b.time||a.gate-b.gate);
  const resultId=id(w,'result'),rows=runners.map((r,i)=>{
    const prize=(BigInt(f.purse)*BigInt(Math.round((RULES.purseShares[i]||0)*100))/100n).toString();
    return {horseId:r.h.id,name:r.h.name,owner:r.e.owner,jockeyId:r.j.id,jockeyName:r.j.name,place:i+1,time:r.time,margin:(r.time-runners[0].time)*16/2.4,prize,gate:r.gate,tactic:r.e.tactic,formVariation:r.formVariation,gear:r.e.gear,splits:r.splits};
  });
  const highlights=frames.filter((_,i)=>i===0||i===Math.floor(frames.length/2)||i===frames.length-2).map(frame=>({time:frame.time,text:`${w.horses[frame.positions[0].horseId].name} leads at ${Math.round(frame.positions[0].distance)}m. The field is ${frame.positions.length} strong.`}));
  highlights.push({time:rows[0].time,text:`${rows[0].name} wins in ${rows[0].time.toFixed(2)} seconds; ${rows[1].name} finishes second, ${rows[1].margin.toFixed(2)} lengths behind.`});
  const result={id:resultId,fixtureId:f.id,day:w.day,title:f.title,country:f.country,track:f.track,surface:f.surface,distance:f.distance,going:f.going,rows,frames,highlights,incidents:[],key:`${w.seed}:${f.id}:${w.rng}`};
  w.results[resultId]=result;f.resultId=resultId;f.status='completed';
  for(const row of rows){const h=w.horses[row.horseId];h.historyRecorded=true;h.starts.push({resultId,fixtureId:f.id,day:w.day,title:f.title,track:f.track,country:f.country,distance:f.distance,surface:f.surface,going:f.going,...row});h.lastRaceDay=w.day;h.fatigue=clamp(h.fatigue+25);h.fitness=clamp(h.fitness+.5);
    if(row.owner==='player')transact(w,BigInt(row.prize),'Race prize',resultId);else w.owners[row.owner].balance=(BigInt(w.owners[row.owner].balance||'0')+BigInt(row.prize)).toString();
    const j=w.jockeys.find(x=>x.id===row.jockeyId);j.starts++;if(row.place===1)j.wins++;
    event(w,'racing',`${h.name}: ${row.place}/${rows.length} in ${f.title}, ${f.distance}m ${f.surface}.`,h.id);const beforeCase=h.medicalCase;exposure(w,h,'race');if(!beforeCase&&h.medicalCase){const m=w.medical.find(m=>m.id===h.medicalCase);result.incidents.push({horseId:h.id,medicalCase:h.medicalCase,text:`Post-race veterinary assessment: ${m.diagnosis}, ${m.severity}. Racing restrictions applied.`});}
  }
  return result;
}
