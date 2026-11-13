// Ephemeral indexes are rebuilt from canonical records and never serialized.
const indexes=new WeakMap();
export function invalidateSchedule(w){indexes.delete(w);}
export function scheduleIndex(w){let index=indexes.get(w);if(index&&index.day===w.day&&index.fixtureCount===w.fixtures.length)return index;index={day:w.day,fixtureCount:w.fixtures.length,horseBookings:new Map(),jockeyBookings:new Set(),npcHorses:Object.values(w.horses).filter(h=>!['player','archive'].includes(h.owner)&&h.status==='active')};indexes.set(w,index);for(const f of w.fixtures){if(f.status!=='scheduled'||f.day<w.day)continue;for(const e of f.entries||[])reserveInIndex(w,f,e,index);}return index;}
export function reserveInIndex(w,f,e,index=scheduleIndex(w)){const bookings=index.horseBookings.get(e.horseId)||[];if(!bookings.some(b=>b.fixtureId===f.id))bookings.push({fixtureId:f.id,day:f.day});index.horseBookings.set(e.horseId,bookings);index.jockeyBookings.add(`${e.jockeyId}:${f.day}`);}
