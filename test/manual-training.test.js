import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {autoStartHorse} from '../src/youngstock.js';
import {train,scheduledTraining} from '../src/care.js';
import {createSaveQueue} from '../src/save-queue.js';
import {encode,decode} from '../src/storage.js';
let baseline;
function make(){baseline??=createWorld({country:'USA',seed:'manual-start',historyYears:0,creativeMode:true,starters:[{}]});const w=structuredClone(baseline),h=Object.values(w.horses).find(h=>h.owner==='player');w.settings.injuryFrequency=0;w.day=1;h.born=w.day-720;h.fatigue=0;h.soundness=100;h.clearance='Race-Cleared';return {w,h};}
test('instant starting maximizes handling, enables automation and preserves DNA, caps, conformation and racing skills',()=>{
 const {w,h}=make(),original=structuredClone({genome:h.genome,potential:h.potential,skills:h.skills,conformation:h.conformation,starts:h.starts});
 autoStartHorse(w,h.id);assert.ok(Object.values(h.youngstock.skills).every(v=>v===100));assert.equal(h.youngstock.starting.step,10);assert.equal(h.youngstock.starting.status,'complete');assert.ok(h.youngstock.starting.milestones.every(m=>m.status==='passed'));assert.ok(h.autoTrain);
 assert.deepEqual({genome:h.genome,potential:h.potential,skills:h.skills,conformation:h.conformation,starts:h.starts},original);
 assert.equal(decode(encode(w)).horses[h.id].youngstock.starting.completionMethod,'instant_handling');assert.throws(()=>autoStartHorse(w,h.id),/already/);
});
test('instant starting keeps age, ownership and medical gates',()=>{
 const {w,h}=make();h.born=w.day-719;assert.throws(()=>autoStartHorse(w,h.id),/24 chronological/);h.born--;h.clearance='No Work';assert.throws(()=>autoStartHorse(w,h.id),/clearance/);h.clearance='Race-Cleared';h.owner=Object.keys(w.owners).find(id=>!['player','archive'].includes(id));assert.throws(()=>autoStartHorse(w,h.id));
});
test('manual and automatic player workouts have equal increased gains, apply caps and suppress duplicate sessions',()=>{
 const {w,h}=make();autoStartHorse(w,h.id);h.trainingPlan='Sprint work';const automatic=structuredClone(w),auto=automatic.horses[h.id];
 const npcWorld=structuredClone(w),npc=npcWorld.horses[h.id];npc.owner=Object.keys(npcWorld.owners).find(id=>!['player','archive'].includes(id));
 const before=h.skills.speed;assert.ok(train(w,h,true,'Sprint work'));assert.equal(scheduledTraining(automatic,auto),'Completed today');assert.ok(train(npcWorld,npc,true,'Sprint work'));
 assert.equal(h.skills.speed,auto.skills.speed);assert.ok(Math.abs((h.skills.speed-before)-2*(npc.skills.speed-before))<1e-10);assert.equal(train(w,h,true,'Sprint work'),false);
 for(const [k,v]of Object.entries(h.skills))assert.ok(v<=h.potential[k]);
});
test('manual save queue never writes on changes, writes the latest state only on explicit flush, and retries only when asked',async()=>{
 const writes=[];let fail=true;const q=createSaveQueue(async value=>{if(fail)throw Error('storage unavailable');writes.push(value);},{delay:null});
 q.schedule({day:1});q.schedule({day:30});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(writes.length,0);assert.ok(q.dirty);await assert.rejects(q.flush());assert.ok(q.dirty);fail=false;await q.flush();assert.deepEqual(writes,[{day:30}]);assert.equal(q.dirty,false);
});
test('fast UI synchronization excludes closed fixtures yet retains same-length news, NPC edits and swapped entries',async()=>{
 const {patchBase,worldPatch,applyWorldPatch}=await import('../src/world-patch.js'),{actionSnapshot}=await import('../src/action-snapshot.js');
 const {w}=make();w.settings.npcProgression=false;w.news=[{id:'story',read:false}];w.fixtures=[...Array.from({length:20000},(_,i)=>({id:`closed-${i}`,status:'closed',day:0,entries:[]})),{id:'future',status:'scheduled',day:2,entries:[{horseId:'old'}]}];
 const npc=Object.values(w.horses).find(h=>!['player','archive'].includes(h.owner)),base=patchBase(w,{identity:true,fast:true}),idle=worldPatch(w,base);
 assert.equal(idle.fixtures.length,0);assert.equal(idle.news,undefined);
 const next=actionSnapshot(w,{horseIds:[npc.id]});next.news[0].read=true;next.horses[npc.id].name='Edited NPC';next.fixtures.at(-1).entries=[{horseId:'new'}];const patch=worldPatch(next,base);
 assert.equal(patch.fixtures.length,1);assert.equal(patch.fixtures[0].entries[0].horseId,'new');assert.equal(patch.news[0].read,true);assert.equal(patch.horses[npc.id].name,'Edited NPC');
 const merged=applyWorldPatch(w,patch);assert.equal(merged.fixtures.length,20001);assert.equal(merged.news[0].read,true);assert.equal(merged.horses[npc.id].name,'Edited NPC');
});
test('a skip waiting for an explicit save waits through newer edits in the same flush',async()=>{
 const pending=[],writes=[];let resumed=false;
 const q=createSaveQueue(v=>new Promise(resolve=>{writes.push(v);pending.push(resolve);}),{delay:null});
 q.schedule(1);const flushing=q.flush();await Promise.resolve();q.schedule(2);const waiting=q.wait().then(()=>resumed=true);pending[0]();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(writes,[1,2]);assert.equal(resumed,false);pending[1]();await Promise.all([flushing,waiting]);assert.equal(q.dirty,false);
});
