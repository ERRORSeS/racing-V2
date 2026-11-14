import { patchBase, worldPatch } from './world-patch.js';
import { recruitAccomplishedSires, updateStudFees } from './stud.js';
import { seedPedigreeCareers } from './history.js';
import { advanceWorld, createWorld } from './world.js';
import { saveCareer, loadCareer, decode } from './storage.js';
let residentWorld=null;
export async function runBackgroundJob(data,send,{cooperative=false}={}){
 let checkpointWritten=false,base=null;
 try{
  if(data.type==='load'){
   const world=await loadCareer();
   if(world){let changed=!!world.migrationNeedsSave;delete world.migrationNeedsSave;
    if(!world.pedigreeHistoryVersion&&world.settings.historyYears>0){seedPedigreeCareers(world);changed=true;}
    if(!world.studInventoryV6){recruitAccomplishedSires(world);updateStudFees(world);world.studInventoryV6=true;changed=true;}
    if(changed)await saveCareer(world);
   }
   residentWorld=world;send({requestId:data.requestId,world});return;
  }
  if(data.type==='save'){const revision=await saveCareer(data.world);residentWorld=data.world;send({requestId:data.requestId,saved:true,revision});return;}
  const world=data.type==='create'?createWorld(data.config):data.type==='import'?decode(data.text):data.world||residentWorld;
  if(data.type==='import'&&!world.pedigreeHistoryVersion&&world.settings.historyYears>0)seedPedigreeCareers(world);
  if(data.type==='advance'||!data.type){
   if(world)base=patchBase(world);
   if(!world)throw Error('Reload the saved career before advancing.');
   if(data.expectedRevision!=null&&data.expectedRevision!==(world.storageRevision||0))throw Error('Simulation snapshot differs from the last saved revision. Reload before advancing.');
   if(!Number.isSafeInteger(data.days)||data.days<1||data.days>36000)throw Error('Advance 1–36,000 days at a time.');
   for(let done=0;done<data.days;){
    const chunk=Math.min(cooperative?1:30,data.days-done);advanceWorld(world,chunk);
    if(world.settings.historyYears>0)seedPedigreeCareers(world);
    await saveCareer(world);done+=chunk;checkpointWritten=true;
    send({requestId:data.requestId,progress:{done,total:data.days,day:world.day}});
    if(cooperative)await yieldTask();
   }
  }else await saveCareer(world,{replace:data.type==='create'||data.type==='import'});
  residentWorld=world;send(base?{requestId:data.requestId,patch:worldPatch(world,base),saved:true}:{requestId:data.requestId,world,saved:true});
 }catch(error){let committed=null;if(checkpointWritten){try{committed=await loadCareer();}catch{/* Last UI snapshot remains available if storage is inaccessible. */}}residentWorld=committed;send({requestId:data.requestId,error:error.message,committed});}
}
function yieldTask(){if(globalThis.scheduler?.yield)return scheduler.yield();return new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();c.port2.close();resolve();};c.port2.postMessage(null);});}

