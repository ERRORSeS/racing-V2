import { horse,event } from './core.js';
import { id } from './random.js';
import { age } from './rules.js';
import { scheduleIndex } from './reservations.js';
export function ensureJockeys(w,f,needed=1){const index=scheduleIndex(w),free=w.jockeys.filter(j=>j.country===f.country&&!index.jockeyBookings.has(`${j.id}:${f.day}`));for(let n=free.length;n<needed+4;n++){const j={id:id(w,'circuit-jockey'),name:`${f.country} Circuit Rider ${w.sequence}`,country:f.country,age:27,start:72,pace:72,finish:72,fee:'15000',starts:0,wins:0};w.jockeys.push(j);free.push(j);}return free;}
export function addCircuitReserves(w,f,count){
 // Published merit/points restrictions must be earned, never manufactured.
 if(f.qualification||f.conditions?.minRating!=null||f.conditions?.minWins>0||(['g1','g2','g3','listed'].includes(f.classId)||/^(Grade|Group) [123]$|Listed/.test(f.grade||'')))return 0;
 let owners=Object.keys(w.owners).filter(key=>!['player','archive'].includes(key)&&w.owners[key].country===f.country&&BigInt(w.owners[key].balance||'0')>1000000n);
 if(!owners.length){const owner=id(w,'circuit-stable');w.owners[owner]={name:`${f.country} Circuit Reserve Stable`,country:f.country,balance:'5000000000',reputation:40};owners=[owner];}
 const years=Math.max(2,f.minAge||2),sex=f.conditions?.sex&&f.conditions.sex!=='open'?f.conditions.sex:null;
 let origin=null;
 for(const country of [...new Set([f.conditions?.bredIn||f.country,...(f.conditions?.bredIn?[]:['Australia','USA'])])]){
  for(const offset of [0,30,90,180,270]){const born=w.day-years*360-offset,racingAge=age({born,country},f.day);if(racingAge>=(f.minAge||2)&&racingAge<=(f.maxAge||12)){origin={country,born};break;}}
  if(origin)break;
 }

 if(!origin)return 0;
 for(let n=0;n<count;n++){const h=horse(w,owners[n%owners.length],origin.country,sex?{sex}:{},1,origin.born);h.location=f.country;h.arrivalDay=w.day;h.historyRecorded=true;h.autoTrain=true;h.circuitReserveFor=f.id;event(w,'world',`${h.name} joins the local circuit as a prepared, unraced reserve prospect.`,h.id);}

 return count;
}
