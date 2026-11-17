import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,advanceWorld} from '../src/world.js';
import {refreshStudIntake,updateStudFees} from '../src/stud.js';
import {setNpcProgression} from '../src/fast-mode.js';
import {retire} from '../src/care.js';
import {cover,collect} from '../src/breeding.js';
import {validate,encode,decode} from '../src/storage.js';
let baseline;function make(){baseline??=createWorld({country:'USA',seed:'stud-intake',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'filly'},{sex:'colt'}]});return structuredClone(baseline);}
test('quarterly intake works in fast mode, creates genuine pedigree IDs without invented starts, and survives reload without duplicates',()=>{
 let w=make();setNpcProgression(w,false);advanceWorld(w,90);const sires=Object.values(w.horses).filter(h=>h.studIntake);assert.equal(sires.length,1);const h=sires[0];assert.ok(w.horses[h.sire]&&w.horses[h.dam]);assert.equal(h.starts.length,0);assert.equal(h.status,'retired');assert.ok(h.brood);assert.equal(refreshStudIntake(w),null);validate(w);w=decode(encode(w));assert.equal(refreshStudIntake(w),null);advanceWorld(w,90);assert.equal(Object.values(w.horses).filter(h=>h.studIntake).length,2);validate(w);
});
test('new higher-quality studs command higher fees with equal achievements',()=>{
 const w=make();w.day=90;const a=refreshStudIntake(w);w.day=180;const b=refreshStudIntake(w);for(const k of Object.keys(a.potential)){a.potential[k]=45;b.potential[k]=95;}a.studFee=b.studFee='500000';updateStudFees(w);assert.ok(BigInt(b.studFee)>BigInt(a.studFee));assert.equal(a.starts.length,0);assert.equal(b.starts.length,0);
});
test('own stallions cover own mares without stud fees and produce owned semen vials once per day',()=>{
 const w=make(),[dam,sire]=Object.values(w.horses).filter(h=>h.owner==='player');w.settings.avoidCloseBreeding=false;for(const h of [dam,sire]){h.born=-1080;retire(w,h.id);}sire.location='UK';w.rng=1;const c=cover(w,dam.id,sire.id);assert.equal(c.fee,'0');assert.ok(c.conceived);const batch=collect(w,sire.id);assert.equal(batch.owner,'player');assert.equal(batch.sireId,sire.id);assert.equal(batch.doses,5);assert.throws(()=>collect(w,sire.id),/already/);validate(w);assert.equal(decode(encode(w)).freezer.find(b=>b.id===batch.id).doses,5);
});
