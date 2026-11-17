import {event,scratchEntries} from './core.js';
import {markFastHorse} from './fast-mode.js';
import {recordPregnancyLoss} from './reproduction.js';
// Stable per-horse timing; no RNG draws or rerolled outcomes on reload.
export function naturalDeathDay(w,h){
 let n=2166136261;for(const c of `${w.seed}:${h.id}:lifespan`)n=Math.imul(n^c.charCodeAt(0),16777619);
 const first=Math.ceil((h.born+25*360)/30)*30,last=Math.floor((h.born+35*360)/30)*30;
 return first+((n>>>0)%(Math.floor((last-first)/30)+1))*30;
}
export function endHorseLife(w,h){
 if(!h||h.status==='deceased'||h.owner==='archive')return false;
 h.status='deceased';h.deceasedDay=w.day;h.deathCause='Natural causes';h.brood=false;h.autoTrain=h.autoRace=h.autoCare=h.autoVet=h.autoFarrier=false;
 for(const p of w.pregnancies||[])if(p.mareId===h.id&&!['foaled','lost'].includes(p.status))recordPregnancyLoss(w,p,'Mare died; pregnancy closed.');
 h.pregnancy=null;h.activeBreedingAttempt=null;h.medicalCase=null;h.clearance='No Work';if(h.npcCampaign)h.npcCampaign.state='Retired from racing';
 for(const m of w.medical||[])if(m.horseId===h.id&&m.status==='active'){m.status='closed';m.outcome='deceased';}
 for(const l of w.listings)if(l.horseId===h.id&&!l.sold){l.closed=true;l.status='withdrawn';}
 scratchEntries(w,h,'deceased');for(const t of w.travel||[])if(t.horseId===h.id&&!['Completed','Canceled'].includes(t.status))t.status='Canceled';h.activeTransport=null;
 markFastHorse(w,h.id);event(w,'life',`${h.name} died of natural causes at ${((w.day-h.born)/360).toFixed(1)} years. Their pedigree and career remain in Memorial.`,h.id);return true;
}
export function monthlyLifespans(w){
 for(const h of Object.values(w.horses)){
  if(h.owner==='archive'||h.status==='deceased'||w.day-h.born<25*360)continue;
  if(w.day>=naturalDeathDay(w,h)){endHorseLife(w,h);continue;}
  if(h.sex==='colt'&&h.brood&&w.day-h.born>=25*360){h.brood=false;h.studServiceEndedDay=w.day;markFastHorse(w,h.id);event(w,'breeding',`${h.name} retires from stud service at age 25.`,h.id);}
 }
}
