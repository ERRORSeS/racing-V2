import test from 'node:test';
import assert from 'node:assert/strict';
import {fastCheckpoint} from '../src/fast-checkpoint.js';
import {applyWorldPatch} from '../src/world-patch.js';
test('fast checkpoint squashes cumulative updates without rewriting the frozen world or duplicating history',()=>{
 const frozen={id:'npc',owner:'npc'},horse={id:'p',owner:'player',starts:[]};
 const initial={horses:{npc:frozen,p:horse},results:{old:{id:'old'}},fixtures:[{id:'f',status:'scheduled'}],events:['old'],ledger:[],sessions:[],day:0,settings:{npcProgression:false}};
 let w=structuredClone(initial),epoch, chunks=Array.from({length:1500},(_,i)=>`base-${i}`),chain=[],squashes=0;
 for(let i=1;i<=60;i++){
  w.day=i;w.events.push(`event-${i}`);w.horses.p.starts.push({id:`r${i}`});w.results[`r${i}`]={id:`r${i}`};w.fixtures[0]={id:'f',status:`day${i}`};
  const patch={day:i,horses:{p:{...w.horses.p,_historyAppend:true,starts:[{id:`r${i}`}]}},results:{[`r${i}`]:w.results[`r${i}`]},fixtures:[w.fixtures[0]],events:[`event-${i}`],ledger:[],sessions:[]};
  // Persist metadata through a JSON round trip just like a reopened save.
  const next=fastCheckpoint(w,patch,epoch,chunks);epoch=JSON.parse(JSON.stringify(next.epoch));
  if(next.squash){chain=[structuredClone(next.patch)];squashes++;assert.equal(next.patch.horses.npc,undefined);assert.equal(next.chunks.length,1500);}else chain.push(structuredClone(next.patch));
  chunks=[...next.chunks,`delta-${i}`];
  let restored=structuredClone(initial);for(const p of chain)restored=applyWorldPatch(restored,p);
  assert.deepEqual(restored,w);
 }
 assert.equal(squashes,2);assert.equal(chunks.length,1513);
});
test('squashing retains earlier purchases, births and root changes omitted by the latest delta',()=>{
 const w={day:1,horses:{bought:{id:'bought',owner:'player',starts:[]}},results:{},fixtures:[],events:['purchase'],ledger:[],sessions:[],settings:{npcProgression:false},news:[{id:'news'}]};
 const first={...w};let plan=fastCheckpoint(w,first,null,['base'],{maxWrites:2});
 w.day=2;w.horses.foal={id:'foal',owner:'player',starts:[]};w.events.push('birth');
 const second={day:2,horses:{foal:w.horses.foal},results:{},fixtures:[],events:['birth'],ledger:[],sessions:[]};
 plan=fastCheckpoint(w,second,JSON.parse(JSON.stringify(plan.epoch)),['base','delta1'],{maxWrites:2});
 assert.ok(plan.squash);assert.deepEqual(Object.keys(plan.patch.horses),['bought','foal']);assert.deepEqual(plan.patch.news,w.news);assert.deepEqual(plan.patch.settings,w.settings);assert.deepEqual(plan.patch.events,['purchase','birth']);
});
