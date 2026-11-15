// Ephemeral indexes never enter a save. Reconcile only at the same invalidation
// points as before so completed-day jockey availability and nomination order agree.
const indexes=new WeakMap();
export function invalidateSchedule(w){const index=indexes.get(w);if(index)index.dirty=true;}
function reserve(index,f,e){
 const bookings=index.horseBookings.get(e.horseId)||[];
 if(!bookings.some(b=>b.fixtureId===f.id))bookings.push({fixtureId:f.id,day:f.day});
 index.horseBookings.set(e.horseId,bookings);
 const key=`${e.jockeyId}:${f.day}`,uses=index.jockeyUses.get(key)||new Set();uses.add(f.id);index.jockeyUses.set(key,uses);index.jockeyBookings.add(key);
}
function snapshot(f){return {entries:f.entries,count:f.entries.length,day:f.day,bookings:f.entries.map(e=>({horseId:e.horseId,jockeyId:e.jockeyId}))};}
function remove(index,fixtureId,previous){
 for(const e of previous.bookings){const bookings=index.horseBookings.get(e.horseId);if(bookings){const next=bookings.filter(b=>b.fixtureId!==fixtureId);if(next.length)index.horseBookings.set(e.horseId,next);else index.horseBookings.delete(e.horseId);}const key=`${e.jockeyId}:${previous.day}`,uses=index.jockeyUses.get(key);if(uses){uses.delete(fixtureId);if(!uses.size){index.jockeyUses.delete(key);index.jockeyBookings.delete(key);}}}
 index.fixtures.delete(fixtureId);
}
export function scheduleIndex(w){
 let index=indexes.get(w);if(index&&!index.dirty&&index.day===w.day&&index.fixtureCount===w.fixtures.length)return index;
 if(!index){index={horseBookings:new Map(),jockeyBookings:new Set(),jockeyUses:new Map(),fixtures:new Map()};indexes.set(w,index);}
 index.day=w.day;index.fixtureCount=w.fixtures.length;index.dirty=false;
 index.npcHorses=Object.values(w.horses).filter(h=>!['player','archive'].includes(h.owner)&&h.status==='active');index.npcByCountry=new Map();
 const trips=new Map((w.travel||[]).filter(t=>['Reserved','InTransit','Acclimatizing'].includes(t.status)).map(t=>[t.id,t]));
 for(const h of index.npcHorses){const trip=trips.get(h.activeTransport);for(const country of new Set([h.location,trip?.destination].filter(Boolean))){const pool=index.npcByCountry.get(country)||[];pool.push(h);index.npcByCountry.set(country,pool);}}
 const seen=new Set();
 for(const f of w.fixtures){const previous=index.fixtures.get(f.id);if(f.status!=='scheduled'||f.day<w.day){if(previous)remove(index,f.id,previous);continue;}seen.add(f.id);if(previous&&previous.entries===f.entries&&previous.count===f.entries.length&&previous.day===f.day&&previous.bookings.every((e,i)=>e.horseId===f.entries[i].horseId&&e.jockeyId===f.entries[i].jockeyId))continue;if(previous)remove(index,f.id,previous);for(const e of f.entries||[])reserve(index,f,e);index.fixtures.set(f.id,snapshot(f));}
 for(const [id,previous]of index.fixtures)if(!seen.has(id))remove(index,id,previous);
 return index;
}
export function reserveInIndex(w,f,e,index=scheduleIndex(w)){reserve(index,f,e);index.fixtures.set(f.id,snapshot(f));}
