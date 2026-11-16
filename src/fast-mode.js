import {invalidateSchedule} from './reservations.js';
export const fastMode=w=>w.settings?.npcProgression===false;
const states=new WeakMap();
function state(w){let s=states.get(w);if(!s){s={dirty:new Set(),owned:new Set(Object.values(w.horses).filter(h=>h.owner==='player').map(h=>h.id))};states.set(w,s);}return s;}
export function beginFastSkip(w){const s=state(w);s.dirty.clear();s.owned=new Set(Object.values(w.horses).filter(h=>h.owner==='player').map(h=>h.id));return s;}
export function fastDirty(w){return state(w).dirty;}
export function fastOwned(w){const s=state(w);return [...s.owned].map(id=>w.horses[id]).filter(h=>h?.owner==='player');}
export function markFastHorse(w,...ids){if(!fastMode(w))return;const s=state(w);for(const id of ids.filter(Boolean)){s.dirty.add(id);if(w.horses[id]?.owner==='player')s.owned.add(id);}}
export function relatedBreeding(w,c){return !fastMode(w)||c.owner==='player'||w.horses[c.damId]?.owner==='player'||w.horses[c.damId]?.ownership?.some(o=>o.owner==='player');}
export function setNpcProgression(w,enabled){w.settings.npcProgression=!!enabled;states.delete(w);if(!enabled)for(const f of w.fixtures)if(f.status==='scheduled'){f.entries=f.entries.filter(e=>e.owner==='player');delete f.fieldHealth;}invalidateSchedule(w);}
