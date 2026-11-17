import {fastMode,fastDirty} from './fast-mode.js';
import {decodeField} from './archive-codec.js';
import {ARCHIVE_FIELDS,fieldIdentity,inheritArchiveFields,hasPackedFields,repackHorseFields} from './archive-fields.js';
import {tailView,trimDisplayHistories,hydrateDisplayArchive,DISPLAY_FIELDS} from './ui-snapshot.js';
// A bounded stamp avoids retaining a second serialized copy of every ancestor.
function archiveStamp(h){const text=JSON.stringify(h);let a=2166136261,b=2654435761;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);}return `${text.length}:${a>>>0}:${b>>>0}`;}
// Completed races and these histories are append-only. Transfer additions and
// mutable records, rather than cloning every old replay and training log.
const ROOT_HISTORY=['events','ledger','sessions'];
const staticValue=fieldIdentity;
const HORSE_STATIC=['genome','potential','conformation','originRules'];
const staticKeys=h=>h._uiArchiveFields?DISPLAY_FIELDS:h.owner==='archive'||hasPackedFields(h)?ARCHIVE_FIELDS:HORSE_STATIC;
const BULKY_FIELDS=['youngstock','traitInstances','coat'];
const HORSE_HISTORY=['starts','ownership','soundnessHistory','durabilityEvents','valuationHistory','npcTrainingArchive'];
function bulkyStamps(h){const stamps=Object.fromEntries(BULKY_FIELDS.filter(key=>h[key]!==undefined).map(key=>[key,archiveStamp(h[key])]));repackHorseFields(h);return stamps;}
export function patchBase(w,{identity=false,fast=false}={}){const entries=Object.entries(w.horses).filter(([,h])=>!fast||h.owner==='player');return {
 fast,rootRefs:fast&&identity?Object.fromEntries(Object.entries(w).filter(([,v])=>Array.isArray(v))):null,fixtureRefs:fast&&identity?new Map(w.fixtures.map(f=>[f.id,f])):null,rootLengths:fast?Object.fromEntries(Object.entries(w).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])):null,fixtureStates:fast?new Map(w.fixtures.map(f=>[f.id,`${f.status}:${f.day}:${f.entries.length}`])):null,playerIds:fast?new Set(entries.map(([id])=>id)):null,fastChanged:fast?fastDirty(w):null,
 horseStatic:new Map(entries.map(([id,h])=>[id,Object.fromEntries(staticKeys(h).map(key=>[key,staticValue(h,key)]))])),
 horseFields:identity||fast?null:new Map(Object.entries(w.horses).filter(([,h])=>h.owner!=='archive'&&!hasPackedFields(h)).map(([id,h])=>[id,bulkyStamps(h)])),
 horseRefs:identity?new Map(Object.entries(w.horses)):null,
 lengths:Object.fromEntries(ROOT_HISTORY.map(key=>[key,w[key].length])),
 horseLengths:new Map(entries.map(([id,h])=>[id,Object.fromEntries(HORSE_HISTORY.map(key=>[key,h[key]?.length||0]))])),
 results:new Set(Object.keys(w.results)),
 completed:new Set(w.fixtures.filter(f=>f.status==='completed').map(f=>f.id)),
 archives:identity||fast?null:new Map(Object.values(w.horses).filter(h=>h.owner==='archive').map(h=>[h.id,archiveStamp(h)]))
};}
const FAST_MUTABLE_ROOTS=new Set([...ROOT_HISTORY,'fixtures','medical','listings','pregnancies','pregnancyScans','coverings','breedingAttempts','studContracts','auctionEvents','travel','freezer','staff','jockeys','calendarGenerationLog']);
function unchangedFastRoot(w,base,key,length){
 if(base.rootRefs)return !ROOT_HISTORY.includes(key)&&key!=='fixtures'&&base.rootRefs[key]===w[key];
 return !FAST_MUTABLE_ROOTS.has(key)&&w[key].length===length;
}
export function worldPatch(w,base){
 const {_uiView,...source}=w;
 if(base.fast)for(const [key,length]of Object.entries(base.rootLengths))if(unchangedFastRoot(w,base,key,length))delete source[key];
 return {
 ...source,...Object.fromEntries(Object.entries(base.lengths).map(([key,length])=>[key,w[key].slice(length)])),
 results:Object.fromEntries(Object.entries(w.results).filter(([id])=>!base.results.has(id))),
 fixtures:w.fixtures.filter(f=>base.fast?(base.fixtureRefs?base.fixtureRefs.get(f.id)!==f:base.fixtureStates.get(f.id)!==`${f.status}:${f.day}:${f.entries.length}`):!base.completed.has(f.id)),
 horses:Object.fromEntries(Object.entries(w.horses).filter(([id,h])=>base.fast?(h.owner==='player'||base.playerIds.has(id)||base.fastChanged.has(id)||base.horseRefs&&base.horseRefs.get(id)!==h):base.horseRefs?base.horseRefs.get(id)!==h:h.owner!=='archive'||base.archives.get(id)!==archiveStamp(h)).map(([id,h])=>{
  const lengths=base.horseLengths.get(id),{_uiArchiveFields,...fields}=h;if(!lengths)return [id,_uiArchiveFields?{...fields,...Object.fromEntries(Object.entries(_uiArchiveFields).map(([key,value])=>[key,decodeField(value)]))}:h];const next={...fields,_historyAppend:true};
  for(const key of staticKeys(h))if(base.horseStatic?.get(id)?.[key]===staticValue(h,key)){delete next[key];next._partialHorse=true;}else next[key]=_uiArchiveFields?.[key]?decodeField(_uiArchiveFields[key]):h[key];
  for(const key of BULKY_FIELDS)if(base.horseFields?.get(id)?.[key]!==undefined&&base.horseFields.get(id)[key]===archiveStamp(h[key])){delete next[key];next._partialHorse=true;}
  for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=h[key].slice(lengths[key]);repackHorseFields(h);return [id,next];
 }))
};}
export function applyWorldPatch(w,patch){
 const fixtures=new Map(w.fixtures.map(f=>[f.id,f]));for(const f of patch.fixtures)fixtures.set(f.id,f);
 const horses={...w.horses};for(const [id,h]of Object.entries(patch.horses)){
  if(!h._historyAppend){horses[id]=h;continue;}
  const {_historyAppend,_partialHorse,...changed}=h,next=_partialHorse?{...w.horses[id],...changed}:changed;for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=(w.horses[id]?.[key]||[]).concat(h[key]);if(patch._uiView){if(h._uiArchiveFields){next._uiArchiveFields={...(w.horses[id]?._uiArchiveFields||{}),...h._uiArchiveFields};for(const key of Object.keys(h._uiArchiveFields))delete next[key];}if(next.npcTrainingArchive)next.npcTrainingArchive=tailView(next.npcTrainingArchive,30);if(next.durabilityEvents)next.durabilityEvents=tailView(next.durabilityEvents,40);}horses[id]=inheritArchiveFields(w.horses[id],next);
 }
 const merged={...w,...patch,...Object.fromEntries(ROOT_HISTORY.map(key=>[key,w[key].concat(patch[key])])),results:{...w.results,...patch.results},fixtures:[...fixtures.values()],horses};return patch._uiView?hydrateDisplayArchive(trimDisplayHistories(merged)):merged;
}
