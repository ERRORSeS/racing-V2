import { age } from './rules.js';
import { career } from './career.js';
export function appraisal(w,h) {
  const c=career(h),structure=Object.values(h.conformation).reduce((a,b)=>a+b,0)/Object.keys(h.conformation).length;
  // Market observes schooling, structure and actual results, not hidden potential.
  const dollars=5000+Math.pow((h.skills.speed+h.skills.stamina)/2,2)*18+Math.pow(structure,3)*80+c.wins*120000+Number(BigInt(c.earnings)/100n)*1.5;
  const award=h.inspection?.grade==='Elite'?1.3:h.inspection?.grade==='Golden'?1.15:1;
  return String(Math.round(Math.min(100000000,dollars)*100*(h.soundness/100)*award*(age(h,w.day)>15?.6:1)));
}
