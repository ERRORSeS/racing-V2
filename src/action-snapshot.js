// Ordinary player actions only: these archives are append-only. Time advancement
// runs on an isolated worker copy instead of sharing records with the UI.
export function actionSnapshot(w,{horseIds=null}={}){
 const {results,fixtures,events,ledger,sessions,horses,...live}=w;
 const selected=horseIds===null?null:new Set([...Object.values(horses).filter(h=>h.owner==='player').map(h=>h.id),...horseIds]);
 const horseLive=Object.fromEntries(Object.entries(horses).filter(([id])=>!selected||selected.has(id)).map(([id,h])=>{const {starts,ownership,soundnessHistory,...mutable}=h;return [id,mutable];}));
 const next=structuredClone({...live,horses:horseLive});
 next.horses={...horses,...next.horses};
 for(const [id,h]of Object.entries(horses)){if(selected&&!selected.has(id))continue;next.horses[id].starts=h.starts.slice();next.horses[id].ownership=h.ownership.slice();if(h.soundnessHistory)next.horses[id].soundnessHistory=h.soundnessHistory.slice();}
 return {...next,results:{...results},fixtures:fixtures.map(f=>f.status==='scheduled'||f.status==='running'?structuredClone(f):f),events:events.slice(),ledger:ledger.slice(),sessions:sessions.slice()};
}
