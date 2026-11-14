import { initializeAppraisal } from './valuation.js';
import { racingWindowReason } from './durability.js';
import { validateCareerTimeline } from './career-timeline.js';
import { RULES, COUNTRIES, age } from './rules.js';
import { RACE_CLASSES, classLabel, conditionsFor } from './race-rules.js';
import { seed, id } from './random.js';
import { resolveRace } from './racing.js';
import { evaluateLegacy } from './legacy.js';
export function seedHistory(w,years=10){
 if(w.historySeeded)return;const currentDay=w.day,currentRng=w.rng,injury=w.settings.injuryFrequency;w.rng=seed(`${w.seed}:historical-races-v3`);w.settings.injuryFrequency=0;
 const cohorts=Object.values(w.horses).filter(h=>h.owner!=='archive'&&h.owner!=='player'&&(h.status==='retired'||age(h,currentDay)>2));
 const saved=new Map(cohorts.map(h=>[h.id,{status:h.status,lastRaceDay:h.lastRaceDay,fatigue:h.fatigue,fitness:h.fitness,arrivalDay:h.arrivalDay,postFoalingUntil:h.postFoalingUntil,soundness:h.soundness}]));
 for(const h of cohorts){h.status='active';h.arrivalDay=currentDay-years*360-1;h.postFoalingUntil=currentDay-years*360-1;h.fitness=85;for(const key of Object.keys(h.skills))h.skills[key]=Math.min(h.potential[key],Math.max(h.skills[key],h.potential[key]*.86));}
 const classes=['maiden','allowance','open','listed','g3','g2','g1'];
 for(let day=currentDay-years*360;day<currentDay-30;day+=45){w.day=day;for(const country of Object.keys(COUNTRIES)){
  const candidates=cohorts.filter(h=>h.country===country&&age(h,day)>=2&&age(h,day)<=8&&!racingWindowReason(w,h,day));
  if(candidates.length<2)continue;
  const c=RACE_CLASSES.find(c=>c.id===classes[Math.floor((day-currentDay+years*360)/45)%classes.length]);
  const conditions={...conditionsFor(c),minAge:2,maxAge:8},eligible=candidates.filter(h=>conditions.maxWins==null||h.starts.filter(s=>s.place===1).length<=conditions.maxWins);if(eligible.length<2)continue;
  const f={id:id(w,'historic-fixture'),seriesId:`history-${country}-${c.id}`,day,country,track:COUNTRIES[country].track,surface:COUNTRIES[country].surface,distance:1600,title:`${country} Heritage ${classLabel(c,country)}`,grade:classLabel(c,country),classId:c.id,raceType:c.type,tier:c.tier,blackType:!!c.blackType,historical:true,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:2,maxAge:8,maxRunners:8,minStarters:2,targetFieldSize:8,conditions,purse:c.purse,fee:'0',going:'good',course:{turns:2,direction:'left',undulating:false},resultId:null};
  const j=w.jockeys.filter(j=>j.country===country);
  // Historical nominations are genuine participants known to have been alive and racing-age.
  f.entries=eligible.slice().sort((a,b)=>c.tier>=5?b.potential.speed-a.potential.speed||a.starts.length-b.starts.length:a.starts.length-b.starts.length||a.id.localeCompare(b.id)).slice(0,8).map((h,i)=>({horseId:h.id,owner:h.owner,jockeyId:j[i%j.length].id,tactic:i%2?'stalk':'close',carriedWeight:56,gear:structuredClone(h.gear)}));
  w.fixtures.push(f);for(const e of f.entries){const h=w.horses[e.horseId];h.lastRaceDay=null;h.fatigue=0;h.soundness=100;}
  resolveRace(w,f.id);
 }}
 w.day=currentDay;w.rng=currentRng;w.settings.injuryFrequency=injury;
 for(const h of cohorts){const prior=saved.get(h.id);h.status=prior.status;h.arrivalDay=prior.arrivalDay;h.postFoalingUntil=prior.postFoalingUntil;h.soundness=prior.soundness;h.fatigue=prior.fatigue;h.fitness=prior.status==='retired'?65:prior.fitness;h.lastRaceDay=h.starts.at(-1)?.day??prior.lastRaceDay;if(h.status==='retired'){h.retiredDay=h.starts.at(-1)?.day??currentDay-30;h.studSince=Math.max(h.retiredDay+30,h.born+1080);}h.historyRecorded=h.starts.length>0;evaluateLegacy(w,h);}
 for(const h of cohorts)validateCareerTimeline(w,h);
 w.historySeeded=true;w.historySeeding={version:1,years,day:currentDay,description:'Canonical historical races were simulated in chronological cohorts. Fast historical races do not have detailed segment replays. No historical prize was credited to current accounts.'};
}

// Missing founder pedigrees receive shared, actually simulated career fixtures.
// Existing recorded careers are never rewritten and no historic cash is paid today.
export function seedPedigreeCareers(w){
 const founders=Object.values(w.horses).filter(h=>h.owner==='archive'&&!h.starts.length&&!h.founderHistoryAssessed);if(!founders.length){w.pedigreeHistoryVersion=1;return;}
 const currentDay=w.day,currentRng=w.rng,frequency=w.settings.injuryFrequency;w.rng=seed(`${w.seed}:pedigree-careers-v1`);w.settings.injuryFrequency=0;
 const groups=new Map();for(const h of founders){const key=`${h.country}:${Math.floor(h.born/720)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(h);}
 for(const group of groups.values())for(let offset=0;offset<group.length;offset+=8){const runners=group.slice(offset,offset+8);if(runners.length===1){const h=founderRival(w,runners[0]);runners.push(h);}const saved=runners.map(h=>({h,state:{status:h.status,skills:h.skills,fitness:h.fitness,fatigue:h.fatigue,soundness:h.soundness,lastRaceDay:h.lastRaceDay,arrivalDay:h.arrivalDay,postFoalingUntil:h.postFoalingUntil,clearance:h.clearance}})),firstDay=Math.max(...runners.map(h=>h.born))+900;
  for(const {h}of saved){h.status='active';h.clearance='Race-Cleared';h.soundness=100;h.fitness=85;h.fatigue=0;h.lastRaceDay=null;h.arrivalDay=firstDay-1;h.postFoalingUntil=firstDay-1;h.skills=Object.fromEntries(Object.keys(h.skills).map(k=>[k,h.potential[k]*.86]));}
  for(let leg=0;leg<3;leg++){w.day=firstDay+leg*21;const c=RACE_CLASSES.find(c=>c.id===['maiden','allowance','open'][leg]),country=runners[0].country,fixtureId=id(w,'founder-fixture'),jockeys=w.jockeys.filter(j=>j.country===country);const f={id:fixtureId,seriesId:'founder-career-archive',day:w.day,country,track:COUNTRIES[country].track,surface:COUNTRIES[country].surface,distance:1600,title:`Founder Career ${classLabel(c,country)}`,grade:classLabel(c,country),classId:c.id,raceType:c.type,tier:c.tier,blackType:false,historical:true,founderArchive:true,provenance:'Shared founder career simulated when filling an unrecorded pedigree; not imported real-world history',status:'scheduled',phase:'EntriesOpen',entries:runners.map((h,i)=>({horseId:h.id,owner:h.owner,jockeyId:jockeys[i].id,tactic:'stalk',carriedWeight:56,gear:structuredClone(h.gear)})),minAge:2,maxAge:6,maxRunners:8,minStarters:2,targetFieldSize:runners.length,conditions:{},purse:c.purse,fee:'0',going:'good',course:{direction:'left',turns:2},resultId:null};w.fixtures.push(f);for(const h of runners)h.fatigue=0;resolveRace(w,f.id);}
  for(const {h,state}of saved){Object.assign(h,state);h.historyRecorded=true;h.founderHistoryAssessed=true;h.founderHistoryProvenance='Three shared simulated founder fixtures; results and winnings are linked, current skills and money preserved.';}
 }
 w.day=currentDay;w.rng=currentRng;w.settings.injuryFrequency=frequency;for(const h of founders){validateCareerTimeline(w,h);initializeAppraisal(w,h,{fresh:true});}w.pedigreeHistoryVersion=1;
}
import { horse as generateFounder } from './core.js';
function founderRival(w,h){const rival=generateFounder(w,'archive',h.country,{},0,h.born);rival.status='retired';return rival;}
