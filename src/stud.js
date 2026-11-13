import { career } from './career.js';
import { age } from './rules.js';
export function updateStudFees(w){for(const h of Object.values(w.horses)){
 if(!h.brood||h.sex!=='colt'||h.status!=='retired')continue;
 const children=Object.values(w.horses).filter(c=>c.sire===h.id),raced=children.filter(c=>c.starts.length),g1=h.starts.filter(s=>s.place===1&&s.classId==='g1').length,progenyG1=children.filter(c=>c.starts.some(s=>s.place===1&&s.classId==='g1')).length,winnerRate=raced.length?children.filter(c=>career(c).wins).length/raced.length:.5;
 const target=Math.round((250000+g1*1500000+progenyG1*4000000+Number(BigInt(career(h).earnings)/100n)*.3)*(raced.length>=5?.6+winnerRate:.9)*(age(h,w.day)>20?.7:1));
 const previous=Number(h.studFee||'250000'),fee=String(Math.max(10000,Math.round(previous*.8+target*.2)));h.studFeeHistory??=[];
 if(h.studFeeHistory.length===0||h.studFee!==fee){h.studFee=fee;h.studFeeHistory.push({day:w.day,fee,basis:{g1Wins:g1,progenyG1Winners:progenyG1,racingOffspring:raced.length,winnerRate}});}
}}
