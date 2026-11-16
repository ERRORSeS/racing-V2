// Keep the frozen world once. Periodically replace recent deltas with one
// cumulative patch, without serializing untouched NPCs or historical races.
const HISTORY=['events','ledger','sessions'];
const SPECIAL=new Set(['horses','results','fixtures',...HISTORY]);
export function fastCheckpoint(w,patch,previous,chunks,{maxWrites=24,maxChunks=1024}={}){
 const epoch=previous||{chunks:[...chunks],lengths:Object.fromEntries(HISTORY.map(k=>[k,w[k].length-patch[k].length])),horses:[],results:[],fixtures:[],roots:[],writes:0};
 const union=(old,add)=>[...new Set([...old,...add])];
 const next={...epoch,horses:union(epoch.horses,Object.keys(patch.horses)),results:union(epoch.results,Object.keys(patch.results)),fixtures:union(epoch.fixtures,patch.fixtures.map(f=>f.id)),roots:union(epoch.roots,Object.keys(patch).filter(k=>!SPECIAL.has(k))),writes:epoch.writes+1};
 const squash=next.writes>=maxWrites||chunks.length-epoch.chunks.length>=maxChunks;
 if(!squash)return {epoch:next,patch,chunks};
 const fixtureIds=new Set(next.fixtures);
 const cumulative={...Object.fromEntries(next.roots.map(k=>[k,w[k]])),...Object.fromEntries(HISTORY.map(k=>[k,w[k].slice(epoch.lengths[k])])),horses:Object.fromEntries(next.horses.filter(id=>w.horses[id]).map(id=>[id,w.horses[id]])),results:Object.fromEntries(next.results.map(id=>[id,w.results[id]])),fixtures:w.fixtures.filter(f=>fixtureIds.has(f.id))};
 return {epoch:{...next,writes:0},patch:cumulative,chunks:epoch.chunks,squash:true};
}
