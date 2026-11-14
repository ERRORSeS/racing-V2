import { initializeV7World } from './v7.js';
import { patchBase, worldPatch, applyWorldPatch } from './world-patch.js';
import { validateCareerTimeline, repairCareerTimelines } from './career-timeline.js';
import { LOCI, incompatibleGenotypes } from './genetics.js';
import { upgrade } from './upgrade.js';
import {RULES,COUNTRIES,SKILLS} from './rules.js';
export function validate(w){
 if(w?.storageRevision!=null&&(!Number.isSafeInteger(w.storageRevision)||w.storageRevision<0))throw Error('Invalid save revision.');
 if(!w||w.schema!==RULES.schema)throw Error('Unsupported save version. Original data has not been changed.');
 if(!Number.isSafeInteger(w.day)||w.day<0||!Number.isInteger(w.rng)||w.rng<=0||!Number.isSafeInteger(w.sequence)||!COUNTRIES[w.country]||!/^[-]?\d+$/.test(w.balance)||!w.horses||!w.owners?.player)throw Error('Corrupt world header.');
 for(const key of ['events','ledger','listings','fixtures','sessions'])if(!Array.isArray(w[key]))throw Error(`Missing ${key}.`);
 for(const [key,h] of Object.entries(w.horses)){if(h.id!==key||h.breed!=='Thoroughbred'||!w.owners[h.owner]||!COUNTRIES[h.country]||!Number.isSafeInteger(h.born)||!Array.isArray(h.starts)||!Array.isArray(h.formerNames)||!h.coat||!h.conformation)throw Error('Corrupt horse record.');for(const p of [h.sire,h.dam])if(p&&(!w.horses[p]||w.horses[p].born>=h.born))throw Error('Invalid ancestry.');for(const k of SKILLS)if(!Number.isFinite(h.skills[k])||!Number.isFinite(h.potential[k])||h.skills[k]<0||h.skills[k]>h.potential[k]||h.potential[k]>100)throw Error('Invalid ability.');for(const k of ['soundness','fitness','fatigue','temperament','spookiness'])if(!Number.isFinite(h[k])||h[k]<0||h[k]>100)throw Error(`Invalid ${k}.`);}
 for(const l of w.listings)if(!w.horses[l.horseId]||!/^\d+$/.test(l.price))throw Error('Invalid listing.');
 if(new Set(w.events.map(e=>e.id)).size!==w.events.length)throw Error('Duplicate event identity.');
 for(const e of w.events)if(e.horseId&&!w.horses[e.horseId])throw Error('Missing event horse.');
 if(w.settings?.eliteJuvenileCatalogChance!=null&&(!Number.isFinite(w.settings.eliteJuvenileCatalogChance)||w.settings.eliteJuvenileCatalogChance<0||w.settings.eliteJuvenileCatalogChance>1))throw Error('Invalid juvenile consignment frequency.');
 if(w.settings?.maximumRacingCareerYears!=null&&(!Number.isInteger(w.settings.maximumRacingCareerYears)||w.settings.maximumRacingCareerYears<1||w.settings.maximumRacingCareerYears>5))throw Error('Racing career cap must be 1–5 years.');
 if(!w.settings||!['official','alternative'].includes(w.settings.registryMode)||!Number.isFinite(w.settings.injuryFrequency)||w.settings.injuryFrequency<0||w.settings.injuryFrequency>10)throw Error('Invalid world settings.');
 if(!Number.isInteger(w.journalClearedThrough)||w.journalClearedThrough<0||w.journalClearedThrough>w.events.length)throw Error('Invalid journal cursor.');
 for(const key of ['medical','visits','coverings','freezer','jockeys','staff','news','travel','awards','trackRecords','studBooks'])if(!Array.isArray(w[key]))throw Error(`Missing ${key}.`);
 if(!w.results||typeof w.results!=='object')throw Error('Missing race archive.');
 const jockeys=new Set(w.jockeys.map(j=>j.id)),fixtureById=new Map(w.fixtures.map(f=>[f.id,f])),listingIds=new Set(w.listings.map(l=>l.id));
 if(new Set(w.fixtures.map(f=>f.id)).size!==w.fixtures.length)throw Error('Duplicate fixture identity.');
 if(!Array.isArray(w.calendarGenerationLog)||new Set(w.calendarGenerationLog.map(l=>l.key)).size!==w.calendarGenerationLog.length)throw Error('Invalid calendar generation log.');
 for(const h of Object.values(w.horses)){
  if(!['filly','colt','gelding'].includes(h.sex)||!['active','retired','deceased'].includes(h.status)||!COUNTRIES[h.location]||!Array.isArray(h.traits)||!Array.isArray(h.ownership)||!h.gear||!Number.isFinite(h.condition)||h.condition<1||h.condition>9||!Number.isFinite(h.hoofHealth)||h.hoofHealth<0||h.hoofHealth>100)throw Error('Invalid horse care or identity.');
  if(h.autoRace!=null&&typeof h.autoRace!=='boolean'||h.autoRaceInterval!=null&&(!Number.isInteger(h.autoRaceInterval)||h.autoRaceInterval<5||h.autoRaceInterval>90)||h.autoRaceMaxTier!=null&&!['Auto','2','3','4','5','6','7'].includes(String(h.autoRaceMaxTier)))throw Error('Invalid per-horse race policy.');
  if(h.trainingIntensity!=null&&!['Rest','Light','Balanced','Intense'].includes(h.trainingIntensity)||h.protectRecovery!=null&&typeof h.protectRecovery!=='boolean')throw Error('Invalid training policy.');
  if(h.recoveryFatigueThreshold!=null&&(!Number.isFinite(h.recoveryFatigueThreshold)||h.recoveryFatigueThreshold<10||h.recoveryFatigueThreshold>70))throw Error('Invalid recovery fatigue threshold.');
  if(h.fatigueLog!=null&&(!Array.isArray(h.fatigueLog)||h.fatigueLog.some(d=>!Number.isSafeInteger(d.day)||!Number.isFinite(d.load)||d.load<0||!Number.isFinite(d.recovery)||d.recovery<0||!Array.isArray(d.sources))))throw Error('Invalid fatigue history.');
  const d=h.racingDurability,mv=h.marketAppraisal;
  if(!d||d.version!==7||!Number.isFinite(d.latentDurabilityScore)||d.latentDurabilityScore<0||d.latentDurabilityScore>100||!Number.isFinite(d.individualRacingLongevity)||d.individualRacingLongevity<1||d.individualRacingLongevity>5||!Number.isSafeInteger(d.maximumCareerDurationDays)||d.maximumCareerDurationDays<360||d.maximumCareerDurationDays>1800||!Number.isFinite(d.cumulativeRacingStrain)||d.cumulativeRacingStrain<0||d.cumulativeRacingStrain>1000||!Number.isFinite(d.repetitiveStressIndex)||d.repetitiveStressIndex<0||d.repetitiveStressIndex>100||!Number.isFinite(d.chronicSusceptibility)||d.chronicSusceptibility<0||d.chronicSusceptibility>100||!Array.isArray(d.exposureHistory)||!Array.isArray(h.durabilityEvents))throw Error('Invalid V7 racing durability.');
  const debut=h.starts.length?Math.min(...h.starts.map(s=>s.day)):null;if(d.firstRaceDate!==debut||d.absoluteRaceEndDate!==(debut==null?null:debut+d.maximumCareerDurationDays))throw Error('Racing window disagrees with actual debut.');
  if(!mv||mv.version!==7||!/^\d+$/.test(mv.currentValue)||!/^\d+$/.test(mv.previousValue)||!Number.isFinite(mv.calibration)||mv.calibration<=0||!Array.isArray(mv.processedResultIds)||new Set(mv.processedResultIds).size!==mv.processedResultIds.length||!Array.isArray(h.valuationHistory))throw Error('Invalid canonical appraisal.');
  if(h.safeRacingYears!=null&&(!Number.isFinite(h.safeRacingYears)||h.safeRacingYears < -20||h.safeRacingYears>10))throw Error('Invalid safe racing-year reserve.');
  if(h.sire&&w.horses[h.sire].sex!=='colt'||h.dam&&w.horses[h.dam].sex!=='filly')throw Error('Invalid parent sex.');
  if(!['EE','Ee','eE','ee'].includes(h.coat.extension)||!['AA','Aa','aA','aa'].includes(h.coat.agouti)||!Array.isArray(h.coat.legs)||h.coat.legs.length!==4)throw Error('Invalid coat genotype.');
  if(h.medicalCase&&!w.medical.some(m=>m.id===h.medicalCase&&m.horseId===h.id&&m.status==='active'))throw Error('Broken medical reference.');
  if(h.pregnancy&&!w.coverings.some(c=>c.id===h.pregnancy&&c.damId===h.id&&c.status==='pregnant'))throw Error('Broken pregnancy reference.');
  if(!h.genome||h.genome.version!==1||!h.genome.loci||!h.genome.quantitativeHaplotypes||!h.development||!Array.isArray(h.traitInstances))throw Error('Missing V3 genome or development records.');
  for(const [key,def]of Object.entries(LOCI)){const locus=h.genome.loci[key];if(!locus||!Array.isArray(locus.alleles)||locus.alleles.length!==2||!['verified','inferred','unknown'].includes(locus.confidence)||locus.alleles.some(a=>a!==null&&!def.alleles.includes(a)))throw Error('Invalid genetic locus.');}
  if(incompatibleGenotypes(h.genome))throw Error('Incompatible viable genotype.');
  for(const block of Object.values(h.genome.quantitativeHaplotypes))if(!Array.isArray(block)||block.length!==2||block.some(hap=>!Array.isArray(hap)||hap.length!==8||hap.some(a=>!Number.isInteger(a)||a<0||a>4)))throw Error('Invalid quantitative haplotype.');
  if(!Number.isFinite(h.potentialSoundnessCeiling)||!Number.isFinite(h.irreversibleSoundnessLimit)||h.potentialSoundnessCeiling<0||h.potentialSoundnessCeiling>h.irreversibleSoundnessLimit||h.irreversibleSoundnessLimit>100)throw Error('Invalid recoverable or irreversible soundness limit.');
  const y=h.youngstock,ht=h.height,p=y?.starting;
  if(!ht||!Number.isInteger(ht.currentMm)||ht.currentMm<700||ht.currentMm>1900||!Number.isInteger(ht.geneticMatureMm)||ht.geneticMatureMm<1400||ht.geneticMatureMm>1850||!Array.isArray(ht.measurements)||ht.measurements.some(m=>!Number.isInteger(m.heightMm)||m.heightMm<700||m.heightMm>1900||!Number.isSafeInteger(m.day)))throw Error('Invalid height / growth history.');
  if(!y||!['nursing','preparing','gradual_transition','monitoring','complete'].includes(y.weaning?.stage)||!p||!['not_started','active','paused','blocked_medical','complete'].includes(p.status)||!Number.isInteger(p.step)||p.step<0||p.step>10||!Array.isArray(p.milestones)||p.milestones.length!==10||p.status==='complete'&&(p.step!==10||p.milestones.some(m=>m.status!=='passed')))throw Error('Invalid youngstock / starting state.');
  if(!Array.isArray(y.companions)||y.companions.some(id=>id===h.id||!w.horses[id])||!Array.isArray(y.education)||!Array.isArray(y.careLog)||Object.values(y.skills).some(v=>!Number.isFinite(v)||v<0||v>100))throw Error('Invalid youngstock care record.');
  if(!h.reliability||!Number.isFinite(h.reliability.currentForm)||Math.abs(h.reliability.currentForm)>.04||!Number.isFinite(h.reliability.dailyVolatility)||h.reliability.dailyVolatility<0||h.reliability.dailyVolatility>.3)throw Error('Invalid reliability profile.');
  validateCareerTimeline(w,h,fixtureById);
  const seen=new Set();for(const start of h.starts){if(!w.results[start.resultId]||seen.has(start.resultId)||!/^\d+$/.test(start.prize)||(start.outcome==='Pulled up'?start.place!==null||start.prize!=='0'||start.time!==null:!Number.isInteger(start.place)||start.place<1))throw Error('Invalid career start.');seen.add(start.resultId);}
 }
 for(const f of w.fixtures){if(!Number.isInteger(f.day)||!COUNTRIES[f.country]||!Array.isArray(f.entries)||!['scheduled','running','completed','closed','canceled'].includes(f.status))throw Error('Invalid fixture.');for(const e of f.entries)if(!w.horses[e.horseId]||!jockeys.has(e.jockeyId)||!w.owners[e.owner])throw Error('Invalid race entry.');if(f.resultId&&!w.results[f.resultId])throw Error('Missing committed result.');}
 for(const [key,r] of Object.entries(w.results)){if(r.id!==key||fixtureById.get(r.fixtureId)?.resultId!==r.id||!Array.isArray(r.rows)||!Array.isArray(r.frames))throw Error('Invalid race result.');for(const row of r.rows)if(!w.horses[row.horseId]||(row.outcome==='Pulled up'?row.time!==null||row.place!==null||row.prize!=='0':!Number.isFinite(row.time)||row.time<=0)||!/^\d+$/.test(row.prize))throw Error('Invalid finisher.');}
 for(const r of Object.values(w.results))for(const row of r.rows){const h=w.horses[row.horseId];if(!h.starts.some(s=>s.resultId===r.id)&&!h.careerQuarantine?.some(q=>q.original.resultId===r.id))throw Error('Completed result missing its official career start.');}
 for(const t of w.travel)if(!w.horses[t.horseId]||!COUNTRIES[t.origin]||!COUNTRIES[t.destination]||t.readyDay<t.arrivalDay||t.arrivalDay<t.departureDay)throw Error('Invalid transport booking.');
 for(const n of w.news)if(n.resultId&&!w.results[n.resultId]||n.horseIds.some(id=>!w.horses[id]))throw Error('News refers to a missing source.');
 for(const a of w.awards)if(!w.horses[a.horseId]||a.evidence.some(id=>!w.results[id]))throw Error('Award has missing evidence.');
 for(const point of w.qualifyingPoints||[])if(!w.horses[point.horseId]||!w.results[point.resultId]||!Number.isInteger(point.year)||!Number.isInteger(point.points)||point.points<=0)throw Error('Invalid qualification evidence.');
 for(const auction of w.auctionEvents||[])if(!Array.isArray(auction.listingIds)||auction.listingIds.some(id=>!listingIds.has(id)))throw Error('Invalid auction catalog reference.');
 for(const c of w.coverings)if(!w.horses[c.damId]||!w.horses[c.sireId]||c.foalId&&!w.horses[c.foalId])throw Error('Invalid covering.');
 for(const b of w.freezer)if(!w.horses[b.sireId]||!Number.isInteger(b.doses)||b.doses<0||!Number.isFinite(b.viability))throw Error('Invalid freezer stock.');
 return w;
}
function hash(s){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16);}
export function encode(w){validate(w);const payload=JSON.stringify(w);if(/[<>]/.test(payload))throw Error('Use plain text without angle brackets in saved names or notes.');return JSON.stringify({format:'thoroughbred-racing',checksum:hash(payload),payload});}
export function decode(text){const e=JSON.parse(text);if(e.format!=='thoroughbred-racing'||typeof e.payload!=='string'||hash(e.payload)!==e.checksum)throw Error('Save checksum failed. Restore a backup; your existing career is unchanged.');const w=JSON.parse(e.payload);if(/[<>]/.test(JSON.stringify(w)))throw Error('Save contains unsupported markup.');validateLegacy(w);upgrade(w);repairCareerTimelines(w);initializeV7World(w);return validate(w);}
export function save(w,storage=localStorage){const data=encode(w),old=storage.getItem(RULES.saveKey);if(old)storage.setItem(`${RULES.saveKey}.backup`,old);storage.setItem(RULES.saveKey,data);}
export function load(storage=localStorage){const data=storage.getItem(RULES.saveKey);return data?decode(data):null;}

function validateLegacy(w) {
 if(!w||![1,2,3,5,6,7].includes(w.schema)||!w.horses||!w.owners||!Array.isArray(w.fixtures)||!Array.isArray(w.listings)||!Array.isArray(w.events))throw Error('Unsupported or corrupt save. Original career is unchanged.');
 // Full validation follows additive migration and the one-time career audit.
}
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('first-light-careers',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function dbRead(key){const db=await database();return new Promise((resolve,reject)=>{
 const tx=db.transaction('snapshots','readonly'),store=tx.objectStore('snapshots'),r=store.get(key);let value,failure;
 r.onsuccess=()=>{
  if(r.result?.format==='first-light-manifest-v3'){
   const manifest=r.result;if(!Array.isArray(manifest.chunks)||!manifest.chunks.length){failure=Error('Invalid snapshot manifest. Restore the previous autosave.');tx.abort();return;}const records=new Array(manifest.chunks.length);value={format:'manifest-records-v3',revision:manifest.revision,records};
   manifest.chunks.forEach((key,index)=>{const chunk=store.get(key);chunk.onsuccess=()=>{if(!chunk.result){failure=Error('Snapshot chunk missing. Restore the previous autosave.');tx.abort();return;}records[index]=chunk.result;};});
  }else if(r.result?.format==='first-light-pointer-v1'){const snapshot=store.get(r.result.slot);snapshot.onsuccess=()=>{value=snapshot.result;if(!value){failure=Error('Snapshot slot missing. Restore the previous autosave.');tx.abort();}};}
  else value=r.result;
 };
 tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=tx.onabort=()=>{db.close();reject(failure||tx.error);};
});}
export async function pack(text){if(typeof CompressionStream==='undefined')return text;return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob();}
export async function unpack(data){if(typeof data==='string')return data;return new Response(data.stream().pipeThrough(new DecompressionStream('gzip'))).text();}
let persistedBase=null;
export async function saveCareer(w,{replace=false}={}){
 validate(w);
 const delta=!replace&&persistedBase?.revision===(w.storageRevision||0)&&persistedBase.manifest;
 const payload=await pack(JSON.stringify(delta?worldPatch(w,persistedBase.base):w));
 const db=await database();let nextRevision;
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),previous=store.get('current');let failure;
  previous.onsuccess=()=>{
   const old=previous.result,currentRevision=old?.revision??old?.world?.storageRevision??0;
   if(!replace&&(w.storageRevision||0)!==currentRevision){failure=Error('Another tab or newer career has saved changes. Export your unsaved work, then reload before continuing.');tx.abort();return;}
   if(delta&&(old?.format!=='first-light-manifest-v3'||!Array.isArray(old.chunks))){failure=Error('Snapshot format changed in another tab. Reload before saving.');tx.abort();return;}
   nextRevision=currentRevision+1;
   const key='chunk-v3-'+(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`),manifest={format:'first-light-manifest-v3',revision:nextRevision,chunks:[...(delta?old.chunks:[]),key]};
   try{
    store.put({kind:delta?'patch':'base',payload},key);
    if(old)store.put(old,'backup');store.put(manifest,'current');
    // Both manifests and all referenced chunks commit atomically. Only discard
    // chunks no longer reachable from either the current or backup manifest.
    const keep=new Set([...manifest.chunks,...(old?.chunks||[]),...(old?.slot?[old.slot]:[])]),keys=store.getAllKeys();
    keys.onsuccess=()=>{for(const candidate of keys.result)if((String(candidate).startsWith('chunk-v3-')||['slot-a','slot-b'].includes(candidate))&&!keep.has(candidate))store.delete(candidate);};
   }catch(error){failure=error;tx.abort();}
  };
  tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(failure||tx.error);
 });w.storageRevision=nextRevision;persistedBase={revision:nextRevision,manifest:true,base:patchBase(w)};return nextRevision;}finally{db.close();}
}
async function readSnapshot(data){
 let w,manifest=false;
 if(data?.format==='manifest-records-v3'){
  for(const chunk of data.records){const next=JSON.parse(await unpack(chunk.payload));if(chunk.kind==='base')w=next;else if(w&&chunk.kind==='patch')w=applyWorldPatch(w,next);else throw Error('Invalid snapshot chunk order.');}
  if(!w)throw Error('Snapshot base missing.');w.storageRevision=data.revision;manifest=true;
 }else if(data?.format==='first-light-packed-v2'){w=JSON.parse(await unpack(data.payload));w.storageRevision=data.revision;}
 else if(data?.format==='first-light-native-v1')w=data.world;
 else {w=decode(await unpack(data));w.storageRevision=0;}
 const needsMigration=w.schema!==7||w.v7Migration?.version!==7;upgrade(w);repairCareerTimelines(w);initializeV7World(w);validate(w);if(needsMigration)Object.defineProperty(w,'migrationNeedsSave',{value:true,enumerable:false,configurable:true});persistedBase={revision:w.storageRevision||0,manifest:manifest&&!needsMigration,base:patchBase(w)};return w;
}
export async function loadCareer(){const data=await dbRead('current');if(data)return readSnapshot(data);const legacy=typeof localStorage==='undefined'?null:load();if(legacy){legacy.storageRevision=0;await saveCareer(legacy);}return legacy;}
export async function backupCareer(){const data=await dbRead('backup');if(data)return readSnapshot(data);const legacy=localStorage.getItem(`${RULES.saveKey}.backup`);if(!legacy)throw Error('No previous autosave available.');return decode(legacy);}
