import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {patchBase,worldPatch,applyWorldPatch} from '../src/world-patch.js';

test('Archive comparison baselines stay bounded and detect historical record changes',()=>{
 const h={id:'ancestor',owner:'archive',name:'Archived Ancestor',starts:[],ownership:[],durabilityEvents:[],valuationHistory:[],notes:'Historical evidence '.repeat(20000)},w={horses:{ancestor:h},results:{},fixtures:[],events:[],ledger:[],sessions:[]};const original=structuredClone(w),base=patchBase(w);assert.ok(base.archives.get(h.id).length<64);assert.deepEqual(worldPatch(w,base).horses,{});h.notes='J'+h.notes.slice(1);assert.ok(worldPatch(w,base).horses[h.id],'Same-length historical changes must be detected');h.durabilityEvents.push({day:0,type:'Verified clinical record'});assert.ok(worldPatch(w,base).horses[h.id]);assert.deepEqual(applyWorldPatch(original,worldPatch(w,base)),w);
});

test('Save queue retains unsaved recovery data, then releases the large career after persistence',()=>{
 const moduleUrl=new URL('../src/save-queue.js',import.meta.url).href;
 const child=spawnSync(process.execPath,['--expose-gc','--input-type=module','-e',`
 import assert from 'node:assert/strict';import {createSaveQueue} from ${JSON.stringify(moduleUrl)};
 let fail=true;const queue=createSaveQueue(async()=>{if(fail)throw Error('Temporary save failure');},{delay:60000});let career={horses:new Array(100000).fill('Recovery record')};const ref=new WeakRef(career);queue.schedule(career);try{await queue.flush();}catch{}career=null;
 for(let i=0;i<5;i++){await new Promise(setImmediate);global.gc();}assert.ok(ref.deref(),'Unsaved career was discarded');fail=false;await queue.flush();
 for(let i=0;i<10;i++){await new Promise(setImmediate);global.gc();}assert.equal(ref.deref(),undefined,'Saved career remains pinned by the idle save queue');assert.equal(queue.dirty,false);
 `],{encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr||child.stdout||child.error?.message);
});
