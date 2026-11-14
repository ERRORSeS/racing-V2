import { eligibility, enterRace } from './racing.js';
import { observedRating } from './race-rules.js';
export function suggestedTier(h){const rating=observedRating(h);return rating==null?2:rating<55?2:rating<70?3:rating<85?4:rating<95?5:rating<105?6:7;}
export function autoRegister(w){
 for(const h of Object.values(w.horses)){
  if(h.owner!=='player'||!h.autoRace)continue;
  const booked=w.fixtures.find(f=>f.status==='scheduled'&&f.day>=w.day&&f.entries.some(e=>e.horseId===h.id));if(booked){h.autoRaceStatus=`Entered: ${booked.title}`;continue;}
  const journey=w.travel.find(t=>t.horseId===h.id&&['Reserved','InTransit','Acclimatizing'].includes(t.status)),country=journey?.destination||h.location;
  const interval=h.autoRaceInterval??21,last=h.lastRaceDay;
  const maxTier=h.autoRaceMaxTier==='Auto'||h.autoRaceMaxTier==null?suggestedTier(h):Number(h.autoRaceMaxTier);
  const candidates=w.fixtures.filter(f=>f.status==='scheduled'&&f.day>w.day&&f.day<=w.day+21&&f.country===country&&(last==null||f.day-last>=interval)&&((f.tier||0)<=maxTier||h.autoRaceGoal==='USA Derby'&&(h.autoRaceMaxTier==='Auto'||h.autoRaceMaxTier==null)&&(f.qualifyingRoute||f.majorSeriesId==='kentucky-derby'))&&!eligibility(w,h,f));
  candidates.sort((a,b)=>{const score=f=>(h.autoRaceGoal==='USA Derby'&&(f.qualifyingRoute||f.majorSeriesId==='kentucky-derby')?-10000:0)+(!h.starts.some(s=>s.place===1)&&f.classId==='maiden'?-5:0)+Math.abs(f.distance-h.distance)/100+(f.surface===h.surface?0:20)+(f.day-w.day)/10;return score(a)-score(b)||a.day-b.day;});
  let entered=false;
  for(const f of candidates){const jockey=w.jockeys.find(j=>j.country===f.country&&!w.fixtures.some(x=>x.status==='scheduled'&&x.day===f.day&&x.entries.some(e=>e.jockeyId===j.id)));if(!jockey)continue;try{enterRace(w,f.id,h.id,jockey.id);h.autoRaceStatus=`Entered: ${f.title}`;entered=true;break;}catch(error){h.autoRaceStatus=error.message;}}
  if(!entered){const next=w.fixtures.find(f=>f.status==='scheduled'&&f.country===country&&f.day>w.day);h.autoRaceStatus=next?eligibility(w,h,next)||'Waiting for a suitable local race within class and rest policy.':'No upcoming local fixtures.';}
 }
}
