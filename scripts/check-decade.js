import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createWorld, advanceWorld } from '../src/world.js';
import { encode, decode, pack, unpack } from '../src/storage.js';
import { age } from '../src/rules.js';
const w=createWorld({country:'USA',seed:'decade',unlimited:true,balance:'1000000000',starters:[{sex:'filly',potential:85,ability:35},{sex:'colt',potential:90,ability:35}]});
w.settings.injuryFrequency=0;
const before=performance.now();advanceWorld(w,3600);
assert.equal(w.day,3600);
for(const h of Object.values(w.horses)){
  if(h.owner!=='player'&&h.owner!=='archive'&&h.status==='active')assert.ok(age(h,w.day)<10);
  for(const parent of [h.sire,h.dam])if(parent)assert.ok(w.horses[parent].born<h.born);
  assert.equal(new Set(h.starts.map(s=>s.resultId)).size,h.starts.length);
}
for(const o of Object.values(w.owners))assert.ok(BigInt(o.balance)>=0n);
const text=encode(w),compressed=await pack(text),restored=decode(await unpack(compressed));
assert.equal(restored.day,w.day);assert.equal(Object.keys(restored.results).length,Object.keys(w.results).length);
assert.deepEqual(restored.coverings,w.coverings);
console.log(JSON.stringify({seconds:Math.round((performance.now()-before)/100)/10,day:w.day,horses:Object.keys(w.horses).length,races:Object.keys(w.results).length,foals:w.coverings.filter(c=>c.foalId).length,sales:w.listings.filter(l=>l.sold).length,jsonMB:Math.round(text.length/100000)/10,compressedMB:Math.round(compressed.size/100000)/10,sessions:w.sessions.length},null,2));
