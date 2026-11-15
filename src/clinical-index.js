// Record IDs are immutable; values remain the current objects in the canonical array.
const indexes=new WeakMap();
export function medicalById(w,id){
 const records=w.medical;if(!id||!Array.isArray(records))return undefined;
 let cached=indexes.get(records);if(!cached||cached.length>records.length){cached={length:0,positions:new Map()};indexes.set(records,cached);}
 for(let i=cached.length;i<records.length;i++)if(!cached.positions.has(records[i].id))cached.positions.set(records[i].id,i);
 cached.length=records.length;return records[cached.positions.get(id)];
}
