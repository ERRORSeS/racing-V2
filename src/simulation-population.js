// Rebuilt at each public advance boundary to accept imported/test-edited worlds.
// Within a skip, core horse creation appends to this population in insertion order.
const populations=new WeakMap();
export function beginPopulation(w){const p={horses:w.horses,live:Object.values(w.horses).filter(h=>h.owner!=='archive')};populations.set(w,p);return p.live;}
export function liveHorses(w){const p=populations.get(w);return p?.horses===w.horses?p.live:beginPopulation(w);}
export function registerPopulationHorse(w,h){const p=populations.get(w);if(p?.horses===w.horses&&h.owner!=='archive')p.live.push(h);}

export function replacePopulationHorse(w,previous,next){const p=populations.get(w);if(p?.horses===w.horses&&previous.owner!=='archive'){const index=p.live.indexOf(previous);if(index>=0)p.live[index]=next;}}
