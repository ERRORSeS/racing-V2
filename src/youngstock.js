import { seed } from './random.js';
import { age, clamp } from './rules.js';
import { event, charge, ownedHorse } from './core.js';

export const STARTING_STEPS=['Readiness & veterinary exam','Handling foundation','Equipment familiarization','Ridden introduction','Basic flatwork','Track environment','Gate familiarization','Introductory conditioning','Controlled schooling trial','Race-readiness review'];
export const EDUCATION=Object.freeze({
 handling:{label:'Gentle cooperative handling',minDays:7,skills:['human','cooperation'],effort:1},
 halter:{label:'Halter familiarity',minDays:30,skills:['halter','human'],effort:1},
 leading:{label:'Short assisted leading',minDays:45,skills:['leading','cooperation'],effort:2},
 grooming:{label:'Grooming & body-touch confidence',minDays:7,skills:['human','cooperation'],effort:1},
 hooves:{label:'Calm hoof presentation',minDays:30,skills:['hooves','cooperation'],effort:1},
 companions:{label:'Companion & herd routines',minDays:7,skills:['herd','separation'],effort:1},
 novelty:{label:'New objects & environments',minDays:210,skills:['novelty','human'],effort:2},
 groundwork:{label:'Short supervised groundwork',minDays:210,skills:['leading','cooperation'],effort:3},
 transport:{label:'Transport familiarization',minDays:300,skills:['loading','novelty'],effort:2},
 presentation:{label:'Yearling sale presentation',minDays:360,skills:['leading','human'],effort:2},
 assessment:{label:'Pre-starting assessment',minDays:660,skills:['cooperation','novelty'],effort:1},
});
export const chronologicalDays=(h,day)=>Math.max(0,day-h.born);
export function hands(mm){const inches=Math.round(mm/25.4);return `${Math.floor(inches/4)}.${inches%4} hh`;}
export const centimeters=mm=>(mm/10).toFixed(1)+' cm';
function noise(key){return seed(key)/4294967296;}
function growthFraction(days,rate=1){return Math.min(1,.61+.39*(1-Math.exp(-days*rate/240))/(1-Math.exp(-1440*rate/240)));}
export function initializeYoungstock(w,h,{fresh=false,ready=false}={}){
 const days=chronologicalDays(h,w.day),key=`${w.seed||'prospects'}:${h.id}:growth-v5`;
 if(!h.height){
  const sire=w.horses[h.sire]?.height,dam=w.horses[h.dam]?.height;
  const inherited=sire&&dam?(sire.geneticMatureMm+dam.geneticMatureMm)/2:1600;
  const mature=Math.round(clamp(inherited+(noise(key)-.5)*(sire&&dam?120:220),1420,1800)),rate=.85+noise(key+':rate')*.3;
  h.height={geneticMatureMm:mature,maturityRate:rate,curve:'nonlinear-v5',currentMm:Math.round(mature*growthFraction(days,rate)),birthMm:Math.round(mature*.61),uncertaintyMm:days>=1440?10:Math.round(15+65*(1-days/1440)),lastGrowthDay:w.day,measurements:[]};
  h.height.measurements.push({day:w.day,heightMm:h.height.currentMm,source:fresh&&days===0?'birth':'initial estimate',provenance:fresh?'generated inherited stature':'one-time migration; earlier measurements unavailable'});
 }
 if(!h.youngstock){
  const inferredReady=ready||h.starts.length>0||h.owner==='archive'||h.owner!=='player'&&days>=720;
  h.youngstock={version:5,origin:fresh?'birth / generated cohort':'migrated existing horse',lastStage:null,autoCare:true,autoEducation:true,autoWean:true,lastCareDay:null,lastSessionDay:null,independentEating:clamp(days/2),diet:days<180?'Nursing & forage':days<360?'Growing horse ration':'Youngstock ration',water:true,shelter:true,turnoutHours:8,companions:[h.dam].filter(Boolean),socialGroup:'Stable youngstock group',bodyCondition:5,newbornCheck:days<30?'Recommended':'Not applicable',skills:Object.fromEntries(['human','halter','leading','hooves','herd','novelty','cooperation','separation','loading'].map(k=>[k,days>=720?45:10])),careLog:[],education:[],weaning:{stage:days>=360?'complete':'nursing',stageDay:w.day,startDay:null,completedDay:null,paused:false,provenance:days>=360?'Pre-existing weaned cohort; detailed history unavailable':'Dependent foal'},starting:{status:inferredReady?'complete':'not_started',step:inferredReady?10:0,pace:'Balanced',trainerId:null,startDay:null,completedDay:inferredReady?w.day:null,provenance:inferredReady?'Prior racing / prepared NPC cohort':'Not started',milestones:STARTING_STEPS.map((name,i)=>({name,status:inferredReady?'passed':'pending',attempts:0,passedDay:null})),log:[]}};
 }
}
export function lifeStage(h,day){
 if(h.status==='deceased')return 'Deceased';if(h.status==='retired')return h.brood?'Breeding stock':'Retired';
 if(h.medicalCase||h.breakPlan&&!['Complete','Fitness Rebuild'].includes(h.breakPlan.stage))return 'Spelled / rehabilitation';
 const d=chronologicalDays(h,day),y=h.youngstock;
 if(d<30)return 'Newborn';if(d<180)return 'Nursing foal';if(d<360)return y?.weaning.stage==='complete'?'Weanling':'Weaning candidate';if(d<720)return 'Yearling';return y?.starting.status==='complete'?'Active racer':'Two-year-old starting';
}
export function startingBlocker(w,h){
 if(chronologicalDays(h,w.day)<720)return 'Formal starting requires 24 chronological months.';
 if(h.status!=='active'||h.medicalCase||h.soundness<80||h.clearance!=='Race-Cleared'||h.therapy?.status==='active')return 'Veterinary/developmental clearance required.';
 if(h.breakPlan&&!['Complete','Fitness Rebuild'].includes(h.breakPlan.stage))return 'Starting paused during the development spell.';
 if(h.youngstock&&(!h.youngstock.water||!h.youngstock.shelter))return 'Restore suitable water and shelter before starting.';
 if(h.fatigue>45)return 'Recovery required before another starting session.';
 if(h.travelState==='InTransit'||h.arrivalDay>w.day)return 'Travel/acclimatization incomplete.';
 if(h.pregnancy)return 'Pregnancy prevents ridden starting.';
 return null;
}
export function raceEducationBlocker(w,h,f){
 if(chronologicalDays(h,f.day)<720)return 'Needs 24 chronological months before racing; official age is separate.';
 const p=h.youngstock?.starting;if(p&&p.status!=='complete')return `Starting incomplete: ${STARTING_STEPS[p.step]||'race-readiness review'}. Open Training → Starting.`;
 return null;
}
export function startHorse(w,horseId,pace='Balanced'){
 const h=ownedHorse(w,horseId);return createStartingPlan(w,h,pace);
}
export function createStartingPlan(w,h,pace='Balanced'){
 if(!['Gentle','Balanced','Sensitive'].includes(pace))throw Error('Choose Gentle, Balanced or Sensitive pace.');
 const reason=startingBlocker(w,h);if(reason)throw Error(reason);
 const p=h.youngstock.starting;if(p.status==='complete')throw Error('Starting already completed.');
 p.status='active';p.pace=pace;p.startDay??=w.day;p.trainerId=w.staff.find(s=>s.owner===h.owner&&s.role==='Trainer')?.id||'Stable education staff';
 event(w,'development',`${h.name}: ${pace} starting plan ${p.log.length?'resumed':'created'}; next checkpoint ${STARTING_STEPS[p.step]}.`,h.id);return p;
}
export function startingSession(w,h){
 const y=h.youngstock,p=y.starting;if(p.status!=='active'&&p.status!=='blocked_medical')return false;
 const reason=startingBlocker(w,h);if(reason){if(reason.includes('clearance'))p.status='blocked_medical';return false;}
 if(p.status==='blocked_medical')p.status='active';
 if(y.lastSessionDay===w.day||h.lastTrainingDay===w.day||w.day%4===0)return false;
 charge(w,h,'1500','Starting education',h.id);
 const m=p.milestones[p.step];m.attempts++;m.status='in_progress';
 const required=(p.pace==='Balanced'?2:3)+(p.step===6&&h.spookiness>65?2:0)+(p.step===1&&y.skills.cooperation<30?1:0);
 const passed=m.attempts>=required;
 if(passed){m.status='passed';m.passedDay=w.day;p.step++;if(p.step===1||p.step===10)w.visits.push({id:`starting-review-${h.id}-${p.step}`,horseId:h.id,day:w.day,type:'vet',action:'development review',report:p.step===1?'Starting readiness: chronological age, health and soundness reviewed; supervised education cleared.':'Starting final review: all ten education checkpoints passed; appropriate maiden entry may be considered.'});event(w,'development',`${h.name} passed ${m.name}.`,h.id);}else m.status='needs_more_work';
 h.fatigue=clamp(h.fatigue+5);y.skills.cooperation=clamp(y.skills.cooperation+.7);y.lastSessionDay=h.lastTrainingDay=w.day;
 const report=`${m.name}: ${passed?'passed':'needs another calm session'} (${m.attempts}/${required} observations).`;
 p.log.push({day:w.day,checkpoint:m.name,attempt:m.attempts,passed,report,staff:p.trainerId});
 w.sessions.push({id:`starting-${h.id}-${w.day}`,horseId:h.id,day:w.day,activity:'Starting: '+m.name,skill:'cooperation',gain:.7,changes:[],fatigue:h.fatigue,report});
 if(p.step===10){p.status='complete';p.completedDay=w.day;event(w,'development',`${h.name} cleared for an appropriate first race after completing all ten starting checkpoints.`,h.id);}
 return true;
}
export function educationSession(w,h,code=null){
 const y=h.youngstock,d=chronologicalDays(h,w.day);if(y.lastSessionDay===w.day||h.lastTrainingDay===w.day)return false;
 if(!y.water||!y.shelter||h.medicalCase||h.clearance==='No Work'||h.fatigue>30||h.travelState==='InTransit')return false;
 const eligible=Object.entries(EDUCATION).filter(([,a])=>d>=a.minDays);
 if(!eligible.length)return false;
 const chosen=code?eligible.find(([key])=>key===code):eligible.sort((a,b)=>a[1].skills.reduce((n,k)=>n+y.skills[k],0)-b[1].skills.reduce((n,k)=>n+y.skills[k],0))[0];
 if(!chosen)throw Error('This education activity is not age appropriate yet.');
 const [key,a]=chosen;charge(w,h,'500','Youngstock education',h.id);
 const gain=.6+h.temperament/200+(100-h.spookiness)/300;
 for(const k of a.skills)y.skills[k]=clamp(y.skills[k]+gain);
 h.fatigue=clamp(h.fatigue+a.effort);y.lastSessionDay=h.lastTrainingDay=w.day;
 const record={day:w.day,activity:key,staff:'Stable education staff',skills:a.skills,gain,report:`${a.label}: ${a.skills.join(', ')} +${gain.toFixed(2)}. No racing skill or genetic ceiling changed.`};
 y.education.push(record);w.sessions.push({id:`education-${h.id}-${w.day}`,horseId:h.id,day:w.day,activity:a.label,skill:a.skills[0],gain,changes:[],fatigue:h.fatigue,report:record.report});return true;
}
export function weaningReadiness(w,h){
 const y=h.youngstock,reasons=[];
 if(chronologicalDays(h,w.day)<180)reasons.push('At least six chronological months');
 if(y.independentEating<70)reasons.push('Independent eating below 70/100');
 if(h.medicalCase||h.soundness<80)reasons.push('Veterinary review required');
 if(y.bodyCondition<4||y.bodyCondition>7)reasons.push('Body condition review required');
 if(!y.socialGroup.trim()||!y.companions.some(id=>id!==h.dam&&id!==h.id&&w.horses[id]&&w.horses[id].status!=='deceased'&&w.horses[id].location===h.location))reasons.push('A familiar local companion other than the dam');
 if(!y.water||!y.shelter||y.turnoutHours<4)reasons.push('Water, shelter and suitable turnout');
 if(h.travelState==='InTransit'||h.arrivalDay>w.day)reasons.push('Stable environment after travel');
 return reasons;
}
export function beginWeaning(w,horseId){const h=ownedHorse(w,horseId);return planWeaning(w,h);}
function planWeaning(w,h){const y=h.youngstock,p=y.weaning;if(p.stage==='complete')throw Error('Already weaned.');if(p.startDay!=null)throw Error('A weaning plan already exists.');const reasons=weaningReadiness(w,h);if(reasons.length)throw Error(reasons.join('; '));p.stage='preparing';p.stageDay=p.startDay=w.day;p.paused=false;event(w,'development',`${h.name}: gradual weaning planned with familiar companions; preparation begins.`,h.id);}
export function setYoungstockCare(w,horseId,plan){
 const h=ownedHorse(w,horseId),y=h.youngstock;if(!['Nursing & forage','Growing horse ration','Youngstock ration','Starting ration'].includes(plan.diet))throw Error('Choose an appropriate growing-horse diet.');
 const d=chronologicalDays(h,w.day);if(d<180&&plan.diet!=='Nursing & forage')throw Error('A dependent foal needs nursing and forage care.');if(d<720&&plan.diet==='Starting ration')throw Error('Starting ration is reserved for chronological two-year-olds.');
 if(!Number.isFinite(plan.turnoutHours)||plan.turnoutHours<0||plan.turnoutHours>24)throw Error('Turnout must be 0–24 hours.');
 const companions=[...new Set(plan.companions||[])];for(const id of companions)if(!w.horses[id]||id===h.id||w.horses[id].status==='deceased'||w.horses[id].location!==h.location)throw Error('Choose live companions in the same country.');
 Object.assign(y,{diet:plan.diet,water:!!plan.water,shelter:!!plan.shelter,turnoutHours:plan.turnoutHours,companions,socialGroup:String(plan.socialGroup||'').trim(),autoCare:!!plan.autoCare,autoEducation:!!plan.autoEducation,autoWean:!!plan.autoWean});y.careLog.push({day:w.day,kind:'Plan updated',diet:y.diet,companions:[...companions]});event(w,'care',`${h.name}: youngstock care policy updated.`,h.id);
}
export function youngstockDay(w,h){
 if(h.status==='deceased'||h.owner==='archive')return;
 initializeYoungstock(w,h);const y=h.youngstock,d=chronologicalDays(h,w.day),height=h.height;
 if(height.lastGrowthDay!==w.day){height.currentMm=Math.max(height.currentMm,Math.round(height.geneticMatureMm*growthFraction(d,height.maturityRate)));height.uncertaintyMm=d>=1440?10:Math.round(15+65*(1-d/1440));height.lastGrowthDay=w.day;if(d<=1440&&d%90===0&&!height.measurements.some(m=>m.day===w.day))height.measurements.push({day:w.day,heightMm:height.currentMm,source:'scheduled staff measurement'});}
 const stage=lifeStage(h,w.day);if(y.lastStage!==stage){y.lastStage=stage;event(w,'development',`${h.name}: life stage ${stage}; chronological ${Math.floor(d/30)} months, official racing age ${age(h,w.day)}.`,h.id);}
 if(d<720&&y.autoCare&&y.lastCareDay!==w.day){
  try{charge(w,h,'300','Daily youngstock care',h.id);y.lastCareDay=w.day;
   if(y.water&&y.shelter&&y.turnoutHours>=4){y.independentEating=clamp(y.independentEating+(d>=90?.65:.15));y.bodyCondition=h.condition;y.skills.herd=clamp(y.skills.herd+.03);y.skills.separation=clamp(y.skills.separation+.02);}
   if(!y.companions.some(id=>id!==h.dam&&w.horses[id]?.location===h.location&&w.horses[id]?.status!=='deceased')){const companion=Object.values(w.horses).find(x=>x.owner===h.owner&&x.id!==h.id&&x.id!==h.dam&&x.location===h.location&&x.status!=='deceased');if(companion)y.companions.push(companion.id);}
   if(d>=30&&y.newbornCheck==='Recommended'&&h.autoVet){y.newbornCheck='Routine professional check completed';w.visits.push({id:`newborn-check-${h.id}`,horseId:h.id,day:w.day,type:'vet',report:y.newbornCheck});}
  }catch{h.acuteStress='Youngstock care payment overdue';}
 }
 const p=y.weaning;
 if(y.autoWean&&d>=210&&p.stage==='nursing'&&!weaningReadiness(w,h).length)planWeaning(w,h);
 if(p.startDay!=null&&p.stage!=='complete'&&!p.paused){
  const reasons=weaningReadiness(w,h);p.blockers=reasons;
  if(!reasons.length&&w.day-p.stageDay>=10){const next={preparing:'gradual_transition',gradual_transition:'monitoring',monitoring:'complete'}[p.stage];if(next){p.stage=next;p.stageDay=w.day;if(next==='complete'){p.completedDay=w.day;y.diet='Growing horse ration';}event(w,'development',`${h.name}: weaning ${next.replaceAll('_',' ')}.`,h.id);}}
 }
 if(w.day%30===0&&d<720)y.careLog.push({day:w.day,kind:'Monthly care review',stage,diet:y.diet,independentEating:y.independentEating,condition:y.bodyCondition});
 if(d>=720&&h.owner!=='player'&&h.status==='active'&&y.starting.status==='not_started'&&!startingBlocker(w,h))createStartingPlan(w,h);
}
