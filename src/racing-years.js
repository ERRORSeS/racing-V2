import { age } from './rules.js';
export function initializeRacingYears(w,h){h.safeRacingYears??=Math.max(0,6*(h.soundness??100)/100-Math.max(0,age(h,w.day)-2)*.65);}
export function useRacingYears(w,h,years){initializeRacingYears(w,h);h.safeRacingYears=Math.max(-20,h.safeRacingYears-years);}
export function racingYearsLabel(h){if(h.racingDurability)return h.racingDurability.racingRetirementReason==='Racing Career Completed'?'Racing Career Completed':`${Math.max(0,h.safeRacingYears??h.racingDurability.individualRacingLongevity).toFixed(1)} projected racing years, within the debut window`;const years=h.safeRacingYears??6;return years>=0?`${years.toFixed(1)} years before elevated racing risk`:`${(-years).toFixed(1)} years beyond the racing-risk milestone`;}
export function racingYearsRisk(h){const years=h.safeRacingYears??6;return years>0?1:Math.min(12,3+Math.max(0,-years)*2);}
