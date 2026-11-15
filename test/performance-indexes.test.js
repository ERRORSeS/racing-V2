import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleIndex,invalidateSchedule,reserveInIndex} from '../src/reservations.js';
import {childrenOf,updateFamily} from '../src/family-index.js';
import {actionSnapshot} from '../src/action-snapshot.js';
import {patchBase,worldPatch,applyWorldPatch} from '../src/world-patch.js';

test('Incremental bookings match fresh rebuilds after scratches, moves and race completion',()=>{
 const w={day:0,horses:{h:{id:'h',owner:'npc',status:'active',location:'USA',activeTransport:'trip'}},travel:[{id:'trip',status:'Reserved',destination:'GBR'}],fixtures:[{id:'a',day:2,status:'scheduled',entries:[{horseId:'h',jockeyId:'j'}]},{id:'b',day:2,status:'scheduled',entries:[{horseId:'other',jockeyId:'j'}]}]};
 const check=()=>{invalidateSchedule(w);const actual=scheduleIndex(w),fresh=scheduleIndex(structuredClone(w));assert.deepEqual(actual.horseBookings,fresh.horseBookings);assert.deepEqual(actual.jockeyBookings,fresh.jockeyBookings);assert.deepEqual(actual.npcByCountry,fresh.npcByCountry);};
 check();w.fixtures[0].entries=[];check();assert.ok(scheduleIndex(w).jockeyBookings.has('j:2'));w.fixtures[1].day=3;check();const e={horseId:'h',jockeyId:'k'};w.fixtures[0].entries.push(e);reserveInIndex(w,w.fixtures[0],e);check();w.fixtures[0].entries[0].jockeyId='replacement';check();w.fixtures[0].status='completed';check();w.day=4;check();w.fixtures=[];check();
});
test('Produce cache preserves insertion order when parent links change',()=>{
 const w={horses:{a:{id:'a',sire:'s'},b:{id:'b',sire:'t'}}};assert.deepEqual(childrenOf(w,'s').map(h=>h.id),['a']);w.horses.b.sire='s';updateFamily(w,w.horses.b);w.horses.a.sire='t';updateFamily(w,w.horses.a);assert.deepEqual(childrenOf(w,'s').map(h=>h.id),['b']);w.horses.a.sire='s';updateFamily(w,w.horses.a);assert.deepEqual(childrenOf(w,'s').map(h=>h.id),['a','b']);
});
test('Small player action transfers only its changed horse and preserves historical records',()=>{
 const horse=id=>({id,owner:'player',name:id,starts:[{place:2}],ownership:[],soundnessHistory:[],durabilityEvents:[],valuationHistory:[]});const w={horses:{a:horse('a'),b:horse('b')},results:{race:{rows:[{place:2}]}},fixtures:[],events:[],ledger:[],sessions:[]};const base=patchBase(w,{identity:true}),next=actionSnapshot(w,{horseIds:['a']});next.horses.a.name='Changed';next.horses.a.ownership.push({owner:'player'});const patch=worldPatch(next,base);assert.deepEqual(Object.keys(patch.horses),['a']);assert.deepEqual(applyWorldPatch(w,patch),next);assert.equal(w.horses.a.name,'a');assert.equal(next.horses.b,w.horses.b);assert.equal(next.results.race,w.results.race);
});

test('Medical index reads appended cases and current replacements without stale values',async()=>{
 const {medicalById}=await import('../src/clinical-index.js');const w={medical:[{id:'a',status:'active'}]};assert.equal(medicalById(w,null),undefined);assert.equal(medicalById(w,'a'),w.medical[0]);w.medical.push({id:'b'});assert.equal(medicalById(w,'b'),w.medical[1]);w.medical[0]={id:'a',status:'closed'};assert.equal(medicalById(w,'a').status,'closed');w.medical=[{id:'c'}];assert.equal(medicalById(w,'a'),undefined);assert.equal(medicalById(w,'c'),w.medical[0]);
});

test('Name index registers additions and invalidates renamed identities without changing random draws',async()=>{
 const {name,registerName,invalidateNames}=await import('../src/random.js');const w={rng:123456,horses:{}};
 for(let i=0;i<20;i++){const fresh=structuredClone(w);assert.equal(name(w),name(fresh));assert.equal(w.rng,fresh.rng);const h={id:String(i),name:name(w)};w.horses[h.id]=h;registerName(w,h);}
 w.horses['0'].name='Renamed';invalidateNames(w);const fresh=structuredClone(w);assert.equal(name(w),name(fresh));assert.equal(w.rng,fresh.rng);
});
