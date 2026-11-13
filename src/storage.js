import {RULES,COUNTRIES,SKILLS} from './rules.js';
export function validate(w){
 if(!w||w.schema!==RULES.schema)throw Error('Unsupported save version. Original data has not been changed.');
 if(!Number.isSafeInteger(w.day)||w.day<0||!Number.isInteger(w.rng)||w.rng<=0||!Number.isSafeInteger(w.sequence)||!COUNTRIES[w.country]||!/^[-]?\d+$/.test(w.balance)||!w.horses||!w.owners?.player)throw Error('Corrupt world header.');
 for(const key of ['events','ledger','listings','fixtures','sessions'])if(!Array.isArray(w[key]))throw Error(`Missing ${key}.`);
 for(const [key,h] of Object.entries(w.horses)){if(h.id!==key||h.breed!=='Thoroughbred'||!w.owners[h.owner]||!COUNTRIES[h.country]||!Number.isSafeInteger(h.born)||!Array.isArray(h.starts)||!Array.isArray(h.formerNames)||!h.coat||!h.conformation)throw Error('Corrupt horse record.');for(const p of [h.sire,h.dam])if(p&&(!w.horses[p]||w.horses[p].born>=h.born))throw Error('Invalid ancestry.');for(const k of SKILLS)if(!Number.isFinite(h.skills[k])||!Number.isFinite(h.potential[k])||h.skills[k]<0||h.skills[k]>h.potential[k]||h.potential[k]>100)throw Error('Invalid ability.');for(const k of ['soundness','fitness','fatigue','temperament','spookiness'])if(!Number.isFinite(h[k])||h[k]<0||h[k]>100)throw Error(`Invalid ${k}.`);}
 for(const l of w.listings)if(!w.horses[l.horseId]||!/^\d+$/.test(l.price))throw Error('Invalid listing.');
 for(const e of w.events)if(e.horseId&&!w.horses[e.horseId])throw Error('Missing event horse.');return w;
}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);}
export function encode(w){validate(w);const payload=JSON.stringify(w);return JSON.stringify({format:'thoroughbred-racing',checksum:hash(payload),payload});}
export function decode(text){const e=JSON.parse(text);if(e.format!=='thoroughbred-racing'||typeof e.payload!=='string'||hash(e.payload)!==e.checksum)throw Error('Save checksum failed. Restore a backup; your existing career is unchanged.');return validate(JSON.parse(e.payload));}
export function save(w,storage=localStorage){const data=encode(w),old=storage.getItem(RULES.saveKey);if(old)storage.setItem(`${RULES.saveKey}.backup`,old);storage.setItem(RULES.saveKey,data);}
export function load(storage=localStorage){const data=storage.getItem(RULES.saveKey);return data?decode(data):null;}
