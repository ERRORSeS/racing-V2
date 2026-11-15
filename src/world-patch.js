// A bounded stamp avoids retaining a second serialized copy of every ancestor.
function archiveStamp(h){const text=JSON.stringify(h);let a=2166136261,b=2654435761;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);}return `${text.length}:${a>>>0}:${b>>>0}`;}
// Completed races and these histories are append-only. Transfer additions and
// mutable records, rather than cloning every old replay and training log.
const ROOT_HISTORY=['events','ledger','sessions'];
const HORSE_STATIC=['genome','potential','conformation','originRules'];
const HORSE_HISTORY=['starts','ownership','soundnessHistory','durabilityEvents','valuationHistory','npcTrainingArchive'];
export function patchBase(w,{identity=false}={}){return {
 horseStatic:new Map(Object.entries(w.horses).map(([id,h])=>[id,Object.fromEntries(HORSE_STATIC.map(key=>[key,h[key]]))])),
 horseRefs:identity?new Map(Object.entries(w.horses)):null,
 lengths:Object.fromEntries(ROOT_HISTORY.map(key=>[key,w[key].length])),
 horseLengths:new Map(Object.entries(w.horses).map(([id,h])=>[id,Object.fromEntries(HORSE_HISTORY.map(key=>[key,h[key]?.length||0]))])),
 results:new Set(Object.keys(w.results)),
 completed:new Set(w.fixtures.filter(f=>f.status==='completed').map(f=>f.id)),
 archives:identity?null:new Map(Object.values(w.horses).filter(h=>h.owner==='archive').map(h=>[h.id,archiveStamp(h)]))
};}
export function worldPatch(w,base){return {
 ...w,...Object.fromEntries(Object.entries(base.lengths).map(([key,length])=>[key,w[key].slice(length)])),
 results:Object.fromEntries(Object.entries(w.results).filter(([id])=>!base.results.has(id))),
 fixtures:w.fixtures.filter(f=>!base.completed.has(f.id)),
 horses:Object.fromEntries(Object.entries(w.horses).filter(([id,h])=>base.horseRefs?base.horseRefs.get(id)!==h:h.owner!=='archive'||base.archives.get(id)!==archiveStamp(h)).map(([id,h])=>{
  const lengths=base.horseLengths.get(id);if(!lengths)return [id,h];const next={...h,_historyAppend:true};
  for(const key of HORSE_STATIC)if(base.horseStatic?.get(id)?.[key]===h[key]){delete next[key];next._partialHorse=true;}
  for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=h[key].slice(lengths[key]);return [id,next];
 }))
};}
export function applyWorldPatch(w,patch){
 const fixtures=new Map(w.fixtures.map(f=>[f.id,f]));for(const f of patch.fixtures)fixtures.set(f.id,f);
 const horses={...w.horses};for(const [id,h]of Object.entries(patch.horses)){
  if(!h._historyAppend){horses[id]=h;continue;}
  const {_historyAppend,_partialHorse,...changed}=h,next=_partialHorse?{...w.horses[id],...changed}:changed;for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=[...(w.horses[id]?.[key]||[]),...h[key]];horses[id]=next;
 }
 return {...patch,...Object.fromEntries(ROOT_HISTORY.map(key=>[key,[...w[key],...patch[key]]])),results:{...w.results,...patch.results},fixtures:[...fixtures.values()],horses};
}
