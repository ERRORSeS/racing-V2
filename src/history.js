import { RULES, COUNTRIES, age } from './rules.js';
import { RACE_CLASSES, classLabel } from './race-rules.js';
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
  const candidates=cohorts.filter(h=>h.country===country&&age(h,day)>=2&&age(h,day)<=8);
  if(candidates.length<2)continue;
  const c=RACE_CLASSES.find(c=>c.id===classes[Math.floor((day-currentDay+years*360)/45)%classes.length]);
  const f={id:id(w,'historic-fixture'),seriesId:`history-${country}-${c.id}`,day,country,track:COUNTRIES[country].track,surface:COUNTRIES[country].surface,distance:1600,title:`${country} Heritage ${classLabel(c,country)}`,grade:classLabel(c,country),classId:c.id,raceType:c.type,tier:c.tier,blackType:!!c.blackType,historical:true,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:2,maxAge:8,maxRunners:8,minStarters:2,targetFieldSize:8,conditions:{},purse:c.purse,fee:'0',going:'good',course:{turns:2,direction:'left',undulating:false},resultId:null};
  const j=w.jockeys.filter(j=>j.country===country);
  // Historical nominations are genuine participants known to have been alive and racing-age.
  f.entries=candidates.slice().sort((a,b)=>c.tier>=5?b.potential.speed-a.potential.speed||a.starts.length-b.starts.length:a.starts.length-b.starts.length||a.id.localeCompare(b.id)).slice(0,8).map((h,i)=>({horseId:h.id,owner:h.owner,jockeyId:j[i%j.length].id,tactic:i%2?'stalk':'close',carriedWeight:56,gear:structuredClone(h.gear)}));
  w.fixtures.push(f);for(const e of f.entries){const h=w.horses[e.horseId];h.lastRaceDay=null;h.fatigue=0;h.soundness=100;}
  resolveRace(w,f.id);
 }}
 w.day=currentDay;w.rng=currentRng;w.settings.injuryFrequency=injury;
 for(const h of cohorts){const prior=saved.get(h.id);h.status=prior.status;h.arrivalDay=prior.arrivalDay;h.postFoalingUntil=prior.postFoalingUntil;h.soundness=prior.soundness;h.fatigue=prior.fatigue;h.fitness=prior.status==='retired'?65:prior.fitness;h.lastRaceDay=h.starts.at(-1)?.day??prior.lastRaceDay;if(h.status==='retired'){h.retiredDay=h.starts.at(-1)?.day??currentDay-30;h.studSince=Math.max(h.retiredDay+30,h.born+1080);}h.historyRecorded=h.starts.length>0;evaluateLegacy(w,h);}
 w.historySeeded=true;w.historySeeding={version:1,years,day:currentDay,description:'Canonical historical races were simulated in chronological cohorts. Fast historical races do not have detailed segment replays. No historical prize was credited to current accounts.'};
}
