import {age} from './rules.js';
import {seed} from './random.js';
// This only controls NPC consignments, never racing eligibility or player sales.
// Exceptional juveniles must earn their results first; potential grants no badge.
export function npcConsignmentAllowed(w,h){
 if(age(h,w.day)!==2||!h.starts.some(s=>s.place===1&&['g1','g2'].includes(s.classId)))return true;
 return seed(`${w.seed}:${Math.floor(w.day/30)}:${h.id}:elite-juvenile-consignment`)/4294967296<(w.settings.eliteJuvenileCatalogChance??.02);
}
