const families=new WeakMap();
export function invalidateFamily(w){families.delete(w);}
export function updateFamily(w,h){
 const cached=families.get(w);if(!cached||cached.horses!==w.horses)return;
 if(!cached.order.has(h.id))cached.order.set(h.id,cached.order.size);
 const before=cached.parents.get(h.id)||[],after=[h.sire,h.dam].filter(Boolean);
 if(before.length===after.length&&before.every((id,i)=>id===after[i]))return;
 for(const parent of before){const ids=cached.byParent.get(parent);if(ids)cached.byParent.set(parent,ids.filter(id=>id!==h.id));}
 for(const parent of after){const ids=cached.byParent.get(parent)||[],rank=cached.order.get(h.id);let at=ids.findIndex(id=>cached.order.get(id)>rank);if(at<0)at=ids.length;ids.splice(at,0,h.id);cached.byParent.set(parent,ids);}
 cached.parents.set(h.id,after);
}
export function childrenOf(w,parentId){let cached=families.get(w);if(!cached||cached.horses!==w.horses){const byParent=new Map(),parents=new Map(),order=new Map();for(const h of Object.values(w.horses)){order.set(h.id,order.size);const ids=[h.sire,h.dam].filter(Boolean);parents.set(h.id,ids);for(const parent of ids){const children=byParent.get(parent)||[];children.push(h.id);byParent.set(parent,children);}}cached={horses:w.horses,byParent,parents,order};families.set(w,cached);}return (cached.byParent.get(parentId)||[]).map(id=>w.horses[id]);}
