import {npcCampaign} from './npc-campaign.js';
import {resolveRace} from './racing.js';
import {RACE_CLASSES,classLabel} from './race-rules.js';
import { horse,event } from './core.js';
import { id } from './random.js';
import { age } from './rules.js';
import { scheduleIndex } from './reservations.js';
export function ensureJockeys(w,f,needed=1){const index=scheduleIndex(w),free=w.jockeys.filter(j=>j.country===f.country&&!index.jockeyBookings.has(`${j.id}:${f.day}`));for(let n=free.length;n<needed+4;n++){const j={id:id(w,'circuit-jockey'),name:`${f.country} Circuit Rider ${w.sequence}`,country:f.country,age:27,start:72,pace:72,finish:72,fee:'15000',starts:0,wins:0};w.jockeys.push(j);free.push(j);}return free;}
export function addCircuitReserves(w,f,count){
 // Published merit/points restrictions must be earned, never manufactured.
 if(f.qualification||f.historical)return 0;
 if(f.reserveRecruitment?.count>=Math.max(8,(f.targetFieldSize||8)*2))return 0;
 if(f.reserveRecruitment?.day===w.day)return 0;
 const proven=f.conditions?.minRating!=null||f.conditions?.minWins>0||f.conditions?.minPlacings>0||(f.tier||0)>=4;
 let owners=Object.keys(w.owners).filter(key=>!['player','archive'].includes(key)&&w.owners[key].country===f.country&&BigInt(w.owners[key].balance||'0')>1000000n);
 if(!owners.length){const owner=id(w,'circuit-stable');w.owners[owner]={name:`${f.country} Circuit Reserve Stable`,country:f.country,balance:'5000000000',reputation:40};owners=[owner];}
 const years=Math.max(2,f.minAge||2),sex=f.conditions?.sex&&f.conditions.sex!=='open'?f.conditions.sex:null;
 let origin=null;
 for(const country of [...new Set([f.conditions?.bredIn||f.country,...(f.conditions?.bredIn?[]:['Australia','USA'])])]){
  for(const offset of [0,30,90,120,150,180,270]){const born=w.day-years*360-offset,racingAge=age({born,country},f.day);if(racingAge>=(f.minAge||2)&&racingAge<=(f.maxAge||12)&&(!proven||w.day-born>=822)){origin={country,born};break;}}
  if(origin)break;
 }

 if(!origin)return 0;
 const cohort=[];for(let n=0;n<(proven?Math.max(4,count):count);n++){const h=horse(w,owners[n%owners.length],origin.country,{...(sex?{sex}:{}),...(proven?{potential:85+(n%4)*3,ability:73+(n%4)*4}:{}),distance:f.distance,surface:f.surface},1,origin.born);h.location=f.country;h.arrivalDay=w.day;h.fitness=proven?85:65;cohort.push(h);h.historyRecorded=true;h.autoTrain=true;h.circuitReserveFor=f.id;event(w,'world',`${h.name} joins the local circuit as a prepared, unraced reserve prospect.`,h.id);}

 if(proven)seedCircuitCareer(w,cohort,f);
 f.reserveRecruitment={day:w.day,count:(f.reserveRecruitment?.count||0)+cohort.length};
 return cohort.length;
}

function seedCircuitCareer(w,cohort,target){
 const firstDay=Math.max(...cohort.map(h=>h.born+720),w.day-360);
 const today=w.day,frequency=w.settings.injuryFrequency;w.settings.injuryFrequency=0;
 const riders=w.jockeys.filter(j=>j.country===target.country);const saved=cohort.map(h=>({h,arrivalDay:h.arrivalDay,ready:h.youngstock.starting.completedDay}));
 try{
  for(let leg=0;leg<3;leg++){
   w.day=firstDay+leg*30;const c=RACE_CLASSES.find(c=>c.id===(leg===0?'maiden':leg===1?'allowance':'open'));
   for(const h of cohort){h.arrivalDay=w.day-1;h.postFoalingUntil=w.day-1;h.fatigue=0;h.youngstock.starting.completedDay=h.born+720;}
   const f={id:id(w,'circuit-history'),seriesId:'circuit-recruit-career',day:w.day,country:target.country,track:target.track,surface:target.surface,distance:Math.min(2000,target.distance),title:`Circuit Recruitment ${classLabel(c,target.country)}`,grade:classLabel(c,target.country),classId:c.id,tier:c.tier,raceType:c.type,historical:true,provenance:'Actual simulated recruitment cohort, not invented achievements',status:'scheduled',phase:'EntriesOpen',entries:cohort.map((h,i)=>({horseId:h.id,owner:h.owner,jockeyId:riders[i%riders.length].id,tactic:'stalk',gear:structuredClone(h.gear),carriedWeight:56})),minAge:2,maxAge:12,maxRunners:cohort.length,minStarters:2,targetFieldSize:cohort.length,conditions:{},resultId:null,purse:c.purse,fee:'0',going:target.going,course:target.course};
   // Subsequent races are open conditions: a previous maiden winner is not given another maiden start.
   w.fixtures.push(f);resolveRace(w,f.id);
  }
 }finally{w.day=today;w.settings.injuryFrequency=frequency;for(const {h,arrivalDay,ready}of saved){h.arrivalDay=arrivalDay;h.youngstock.starting.completedDay=ready;h.fatigue=0;h.recruitmentHistory='Three actually simulated races, 30 days apart';if(age(h,today)===2){h.precociousRecruit=true;}npcCampaign(w,h);}}
}
