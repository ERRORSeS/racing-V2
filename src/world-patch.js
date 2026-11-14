// Completed races and these histories are append-only. Transfer additions and
// mutable records, rather than cloning every old replay and training log.
const ROOT_HISTORY=['events','ledger','sessions'];
const HORSE_HISTORY=['starts','ownership','soundnessHistory','durabilityEvents','valuationHistory'];
export function patchBase(w){return {
 lengths:Object.fromEntries(ROOT_HISTORY.map(key=>[key,w[key].length])),
 horseLengths:new Map(Object.entries(w.horses).map(([id,h])=>[id,Object.fromEntries(HORSE_HISTORY.map(key=>[key,h[key]?.length||0]))])),
 results:new Set(Object.keys(w.results)),
 completed:new Set(w.fixtures.filter(f=>f.status==='completed').map(f=>f.id)),
 archives:new Map(Object.values(w.horses).filter(h=>h.owner==='archive').map(h=>[h.id,JSON.stringify(h)]))
};}
export function worldPatch(w,base){return {
 ...w,...Object.fromEntries(Object.entries(base.lengths).map(([key,length])=>[key,w[key].slice(length)])),
 results:Object.fromEntries(Object.entries(w.results).filter(([id])=>!base.results.has(id))),
 fixtures:w.fixtures.filter(f=>!base.completed.has(f.id)),
 horses:Object.fromEntries(Object.entries(w.horses).filter(([id,h])=>h.owner!=='archive'||base.archives.get(id)!==JSON.stringify(h)).map(([id,h])=>{
  const lengths=base.horseLengths.get(id);if(!lengths)return [id,h];const next={...h,_historyAppend:true};
  for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=h[key].slice(lengths[key]);return [id,next];
 }))
};}
export function applyWorldPatch(w,patch){
 const fixtures=new Map(w.fixtures.map(f=>[f.id,f]));for(const f of patch.fixtures)fixtures.set(f.id,f);
 const horses={...w.horses};for(const [id,h]of Object.entries(patch.horses)){
  if(!h._historyAppend){horses[id]=h;continue;}
  const {_historyAppend,...next}=h;for(const key of HORSE_HISTORY)if(Array.isArray(h[key]))next[key]=[...(w.horses[id]?.[key]||[]),...h[key]];horses[id]=next;
 }
 return {...patch,...Object.fromEntries(ROOT_HISTORY.map(key=>[key,[...w[key],...patch[key]]])),results:{...w.results,...patch.results},fixtures:[...fixtures.values()],horses};
}
