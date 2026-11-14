const families=new WeakMap();
export function invalidateFamily(w){families.delete(w);}
export function childrenOf(w,parentId){let cached=families.get(w);if(!cached||cached.horses!==w.horses){const byParent=new Map();for(const h of Object.values(w.horses))for(const parent of [h.sire,h.dam])if(parent){const ids=byParent.get(parent)||[];ids.push(h.id);byParent.set(parent,ids);}cached={horses:w.horses,byParent};families.set(w,cached);}return (cached.byParent.get(parentId)||[]).map(id=>w.horses[id]);}
