import { RULES, clamp } from './rules.js';
import { integer } from './random.js';
import { ownedHorse, charge, event } from './core.js';
import { career } from './career.js';
export function grade(mean) {const n=Math.round((mean+Number.EPSILON)*100)/100;return n<5?'Fail':n<8?'Pass':n<9.5?'Golden':'Elite';}
export function inspect(w,horseId) {
  const h=ownedHorse(w,horseId);if(h.sex==='gelding')throw Error('Geldings cannot enter breeding-stock inspection.');if(h.status==='deceased'||h.medicalCase)throw Error('Physical inspection requires a live, medically cleared horse.');if(h.inspection)throw Error('The lifetime inspection attempt has already been used.');
  charge(w,h,RULES.inspectionFee,'Voluntary conformation inspection',h.id);
  const round=v=>Math.round(clamp(v,1,10)*10)/10,noise=()=>integer(w,-2,2)/10;
  const conformation=round(Object.values(h.conformation).reduce((a,b)=>a+b,0)/Object.keys(h.conformation).length+noise());
  const condition=round(10-Math.abs(h.condition-5)*1.3-(100-h.soundness)/30+noise());
  const parents=[w.horses[h.sire],w.horses[h.dam]].filter(Boolean),familyWins=parents.reduce((n,p)=>n+career(p).wins,0);
  const pedigree=round(6+parents.length*1.2+Math.min(.8,familyWins*.1)+noise());
  const potential=round(Object.values(h.potential).reduce((a,b)=>a+b,0)/Object.keys(h.potential).length/10+noise());
  const mean=Math.round((conformation+condition+pedigree+potential)/4*100)/100;
  h.inspection={day:w.day,scores:{conformation,condition,pedigree,potential},mean,grade:grade(mean),report:'Fictional breeding-stock inspection. Pedigree score assesses documentation and recorded family performance, never biological purity. Four marks are rounded to one decimal, mean to two decimals before grading.'};
  event(w,'registry',`${h.name}: one lifetime inspection completed, ${h.inspection.grade}, mean ${mean.toFixed(2)}.`,h.id);return h.inspection;
}
