import { event, scratchEntries } from './core.js';
import { career } from './career.js';
import { age } from './rules.js';
export function updateStudFees(w){for(const h of Object.values(w.horses)){
 if(!h.brood||h.sex!=='colt'||h.status!=='retired')continue;
 const children=Object.values(w.horses).filter(c=>c.sire===h.id),raced=children.filter(c=>c.starts.length),g1=h.starts.filter(s=>s.place===1&&s.classId==='g1').length,progenyG1=children.filter(c=>c.starts.some(s=>s.place===1&&s.classId==='g1')).length,winnerRate=raced.length?children.filter(c=>career(c).wins).length/raced.length:.5;
 const target=Math.round((250000+g1*1500000+progenyG1*4000000+Number(BigInt(career(h).earnings)/100n)*.3)*(raced.length>=5?.6+winnerRate:.9)*(age(h,w.day)>20?.7:1));
 const previous=Number(h.studFee||'250000'),fee=String(Math.max(10000,Math.round(previous*.8+target*.2)));h.studFeeHistory??=[];
 if(h.studFeeHistory.length===0||h.studFee!==fee){h.studFee=fee;h.studFeeHistory.push({day:w.day,fee,basis:{g1Wins:g1,progenyG1Winners:progenyG1,racingOffspring:raced.length,winnerRate}});}
}}


// Retire genuine successful NPC runners; never assign decorative wins or progeny.
export function recruitAccomplishedSires(w){
 const horses=Object.values(w.horses);
 for(const country of new Set(Object.values(w.owners).map(o=>o.country))){
  const proven=horses.filter(h=>h.owner!=='archive'&&h.owner!=='player'&&h.country===country&&h.brood&&h.sex==='colt'&&h.status==='retired'&&career(h).stakesWins>0);
  if(proven.length>=4)continue;
  const h=horses.filter(h=>h.owner!=='archive'&&h.owner!=='player'&&h.country===country&&h.status==='active'&&h.sex==='colt'&&age(h,w.day)>=4&&age(h,w.day)<=12&&!h.medicalCase&&h.soundness>=65&&career(h).stakesWins>0)
   .sort((a,b)=>career(b).stakesWins-career(a).stakesWins||Number(BigInt(career(b).earnings)-BigInt(career(a).earnings)))[0];
  if(!h)continue;
  h.status='retired';h.brood=true;h.retiredDay=w.day;h.studSince=w.day;h.autoTrain=false;h.autoRace=false;
  scratchEntries(w,h,'retired to stud');
  event(w,'life',`${h.name} retires to stud at ${w.owners[h.owner].name} with ${career(h).record} and ${career(h).stakesWins} stakes wins.`,h.id);
 }
}
