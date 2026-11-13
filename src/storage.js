import { LOCI, incompatibleGenotypes } from './genetics.js';
import { upgrade } from './upgrade.js';
import {RULES,COUNTRIES,SKILLS} from './rules.js';
export function validate(w){
 if(!w||w.schema!==RULES.schema)throw Error('Unsupported save version. Original data has not been changed.');
 if(!Number.isSafeInteger(w.day)||w.day<0||!Number.isInteger(w.rng)||w.rng<=0||!Number.isSafeInteger(w.sequence)||!COUNTRIES[w.country]||!/^[-]?\d+$/.test(w.balance)||!w.horses||!w.owners?.player)throw Error('Corrupt world header.');
 for(const key of ['events','ledger','listings','fixtures','sessions'])if(!Array.isArray(w[key]))throw Error(`Missing ${key}.`);
 for(const [key,h] of Object.entries(w.horses)){if(h.id!==key||h.breed!=='Thoroughbred'||!w.owners[h.owner]||!COUNTRIES[h.country]||!Number.isSafeInteger(h.born)||!Array.isArray(h.starts)||!Array.isArray(h.formerNames)||!h.coat||!h.conformation)throw Error('Corrupt horse record.');for(const p of [h.sire,h.dam])if(p&&(!w.horses[p]||w.horses[p].born>=h.born))throw Error('Invalid ancestry.');for(const k of SKILLS)if(!Number.isFinite(h.skills[k])||!Number.isFinite(h.potential[k])||h.skills[k]<0||h.skills[k]>h.potential[k]||h.potential[k]>100)throw Error('Invalid ability.');for(const k of ['soundness','fitness','fatigue','temperament','spookiness'])if(!Number.isFinite(h[k])||h[k]<0||h[k]>100)throw Error(`Invalid ${k}.`);}
 for(const l of w.listings)if(!w.horses[l.horseId]||!/^\d+$/.test(l.price))throw Error('Invalid listing.');
 if(new Set(w.events.map(e=>e.id)).size!==w.events.length)throw Error('Duplicate event identity.');
 for(const e of w.events)if(e.horseId&&!w.horses[e.horseId])throw Error('Missing event horse.');
 if(!w.settings||!['official','alternative'].includes(w.settings.registryMode)||!Number.isFinite(w.settings.injuryFrequency)||w.settings.injuryFrequency<0||w.settings.injuryFrequency>10)throw Error('Invalid world settings.');
 if(!Number.isInteger(w.journalClearedThrough)||w.journalClearedThrough<0||w.journalClearedThrough>w.events.length)throw Error('Invalid journal cursor.');
 for(const key of ['medical','visits','coverings','freezer','jockeys','staff','news','travel','awards','trackRecords','studBooks'])if(!Array.isArray(w[key]))throw Error(`Missing ${key}.`);
 if(!w.results||typeof w.results!=='object')throw Error('Missing race archive.');
 const jockeys=new Set(w.jockeys.map(j=>j.id));
 for(const h of Object.values(w.horses)){
  if(!['filly','colt','gelding'].includes(h.sex)||!['active','retired','deceased'].includes(h.status)||!COUNTRIES[h.location]||!Array.isArray(h.traits)||!Array.isArray(h.ownership)||!h.gear||!Number.isFinite(h.condition)||h.condition<1||h.condition>9||!Number.isFinite(h.hoofHealth)||h.hoofHealth<0||h.hoofHealth>100)throw Error('Invalid horse care or identity.');
  if(h.sire&&w.horses[h.sire].sex!=='colt'||h.dam&&w.horses[h.dam].sex!=='filly')throw Error('Invalid parent sex.');
  if(!['EE','Ee','eE','ee'].includes(h.coat.extension)||!['AA','Aa','aA','aa'].includes(h.coat.agouti)||!Array.isArray(h.coat.legs)||h.coat.legs.length!==4)throw Error('Invalid coat genotype.');
  if(h.medicalCase&&!w.medical.some(m=>m.id===h.medicalCase&&m.horseId===h.id&&m.status==='active'))throw Error('Broken medical reference.');
  if(h.pregnancy&&!w.coverings.some(c=>c.id===h.pregnancy&&c.damId===h.id&&c.status==='pregnant'))throw Error('Broken pregnancy reference.');
  if(!h.genome||h.genome.version!==1||!h.genome.loci||!h.genome.quantitativeHaplotypes||!h.development||!Array.isArray(h.traitInstances))throw Error('Missing V3 genome or development records.');
  for(const [key,def]of Object.entries(LOCI)){const locus=h.genome.loci[key];if(!locus||!Array.isArray(locus.alleles)||locus.alleles.length!==2||!['verified','inferred','unknown'].includes(locus.confidence)||locus.alleles.some(a=>a!==null&&!def.alleles.includes(a)))throw Error('Invalid genetic locus.');}
  if(incompatibleGenotypes(h.genome))throw Error('Incompatible viable genotype.');
  for(const block of Object.values(h.genome.quantitativeHaplotypes))if(!Array.isArray(block)||block.length!==2||block.some(hap=>!Array.isArray(hap)||hap.length!==8||hap.some(a=>!Number.isInteger(a)||a<0||a>4)))throw Error('Invalid quantitative haplotype.');
  if(!Number.isFinite(h.potentialSoundnessCeiling)||!Number.isFinite(h.irreversibleSoundnessLimit)||h.potentialSoundnessCeiling<0||h.potentialSoundnessCeiling>h.irreversibleSoundnessLimit||h.irreversibleSoundnessLimit>100)throw Error('Invalid recoverable or irreversible soundness limit.');
  const seen=new Set();for(const start of h.starts){if(!w.results[start.resultId]||seen.has(start.resultId)||!/^\d+$/.test(start.prize)||!Number.isInteger(start.place)||start.place<1)throw Error('Invalid career start.');seen.add(start.resultId);}
 }
 for(const f of w.fixtures){if(!Number.isInteger(f.day)||!COUNTRIES[f.country]||!Array.isArray(f.entries)||!['scheduled','running','completed','closed','canceled'].includes(f.status))throw Error('Invalid fixture.');for(const e of f.entries)if(!w.horses[e.horseId]||!jockeys.has(e.jockeyId)||!w.owners[e.owner])throw Error('Invalid race entry.');if(f.resultId&&!w.results[f.resultId])throw Error('Missing committed result.');}
 for(const [key,r] of Object.entries(w.results)){if(r.id!==key||!w.fixtures.some(f=>f.id===r.fixtureId&&f.resultId===r.id)||!Array.isArray(r.rows)||!Array.isArray(r.frames))throw Error('Invalid race result.');for(const row of r.rows)if(!w.horses[row.horseId]||!Number.isFinite(row.time)||row.time<=0||!/^\d+$/.test(row.prize))throw Error('Invalid finisher.');}
 for(const t of w.travel)if(!w.horses[t.horseId]||!COUNTRIES[t.origin]||!COUNTRIES[t.destination]||t.readyDay<t.arrivalDay||t.arrivalDay<t.departureDay)throw Error('Invalid transport booking.');
 for(const n of w.news)if(n.resultId&&!w.results[n.resultId]||n.horseIds.some(id=>!w.horses[id]))throw Error('News refers to a missing source.');
 for(const a of w.awards)if(!w.horses[a.horseId]||a.evidence.some(id=>!w.results[id]))throw Error('Award has missing evidence.');
 for(const c of w.coverings)if(!w.horses[c.damId]||!w.horses[c.sireId]||c.foalId&&!w.horses[c.foalId])throw Error('Invalid covering.');
 for(const b of w.freezer)if(!w.horses[b.sireId]||!Number.isInteger(b.doses)||b.doses<0||!Number.isFinite(b.viability))throw Error('Invalid freezer stock.');
 return w;
}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);}
export function encode(w){validate(w);const payload=JSON.stringify(w);if(/[<>]/.test(payload))throw Error('Use plain text without angle brackets in saved names or notes.');return JSON.stringify({format:'thoroughbred-racing',checksum:hash(payload),payload});}
export function decode(text){const e=JSON.parse(text);if(e.format!=='thoroughbred-racing'||typeof e.payload!=='string'||hash(e.payload)!==e.checksum)throw Error('Save checksum failed. Restore a backup; your existing career is unchanged.');const w=JSON.parse(e.payload);if(/[<>]/.test(JSON.stringify(w)))throw Error('Save contains unsupported markup.');validateLegacy(w);return validate(upgrade(w));}
export function save(w,storage=localStorage){const data=encode(w),old=storage.getItem(RULES.saveKey);if(old)storage.setItem(`${RULES.saveKey}.backup`,old);storage.setItem(RULES.saveKey,data);}
export function load(storage=localStorage){const data=storage.getItem(RULES.saveKey);return data?decode(data):null;}

function validateLegacy(w) {
 if(!w||![1,2,3].includes(w.schema)||!w.horses||!w.owners||!Array.isArray(w.fixtures)||!Array.isArray(w.listings)||!Array.isArray(w.events))throw Error('Unsupported or corrupt save. Original career is unchanged.');
 if(w.schema===3)validate(w);
}
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('first-light-careers',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbRead(key){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),r=tx.objectStore('snapshots').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
export async function pack(text){if(typeof CompressionStream==='undefined')return text;return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob();}
export async function unpack(data){if(typeof data==='string')return data;return new Response(data.stream().pipeThrough(new DecompressionStream('gzip'))).text();}
export async function saveCareer(w){
 const data=await pack(encode(w)),db=await database();
 await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),previous=store.get('current');previous.onsuccess=()=>{if(previous.result)store.put(previous.result,'backup');store.put(data,'current');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();
}
export async function loadCareer(){const data=await dbRead('current');if(data)return decode(await unpack(data));const legacy=load();if(legacy)await saveCareer(legacy);return legacy;}
export async function backupCareer(){const data=await dbRead('backup');if(data)return decode(await unpack(data));const legacy=localStorage.getItem(`${RULES.saveKey}.backup`);if(!legacy)throw Error('No previous autosave available.');return decode(legacy);}
