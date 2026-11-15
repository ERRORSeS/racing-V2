import {compactWorld,compactPatch} from './ui-snapshot.js';
import { ensureCalendarHorizon } from './race-catalog.js';
import { patchBase, worldPatch, applyWorldPatch } from './world-patch.js';
import { recruitAccomplishedSires, updateStudFees } from './stud.js';
import { seedPedigreeCareers } from './history.js';
import { advanceWorld, createWorld } from './world.js';
import { saveCareer, loadCareer, backupCareer, exportCareerBlob, releaseCareerBaseline, decode, importCareerFile } from './storage.js';
let residentWorld=null;
export async function runBackgroundJob(data,send,{cooperative=false}={}){
 const emit=message=>{if(data.uiView){if(message.world)message.world=compactWorld(message.world);if(message.committed)message.committed=compactWorld(message.committed);if(message.patch)message.patch=compactPatch(message.patch,residentWorld);}send(message);};
 const previousResident=['import','save-patch','export','get-result','horse-history'].includes(data.type)?residentWorld:null;
 let checkpointWritten=false,base=null;
 try{
  if(data.type==='load'){
   const onProgress=loading=>emit({requestId:data.requestId,loading});let world=await loadCareer({onProgress,includeLegacy:false}),needsSave=false;
   if(!world&&data.legacyText){onProgress({stage:'Reading legacy saved career'});world=decode(data.legacyText);world.storageRevision=0;needsSave=true;}
   if(world){needsSave=ensureCalendarHorizon(world)||!!world.migrationNeedsSave||needsSave;delete world.migrationNeedsSave;}
   // Startup is read-only: show the career before any migration write or optional
   // historical simulation. The UI queues necessary writes after it is usable.
   residentWorld=world;emit({requestId:data.requestId,loading:{stage:'Preparing stable display'}});emit({requestId:data.requestId,world,needsSave});return;
  }
  if(data.type==='get-result'||data.type==='horse-history'){
   if(!residentWorld)residentWorld=await loadCareer({includeLegacy:false});
   if(!residentWorld||residentWorld.seed!==data.seed)throw Error('Reload the saved career before opening this archive.');
   if(data.type==='get-result'){const result=residentWorld.results[data.id];if(!result)throw Error('This result is unavailable in the current checkpoint.');emit({requestId:data.requestId,result});}
   else emit({requestId:data.requestId,events:residentWorld.events.filter(e=>e.horseId===data.id)});return;
  }
  if(data.type==='export'){
   if(!residentWorld&&!data.world)residentWorld=await loadCareer({includeLegacy:false});const source=data.world||residentWorld;if(!source){emit({requestId:data.requestId,needsBase:true});return;}
   if(data.patch&&data.expectedRevision!==(source.storageRevision||0))throw Error('The backup snapshot has changed. Retry exporting.');
   const snapshot=data.patch?applyWorldPatch(source,data.patch):source;emit({requestId:data.requestId,blob:exportCareerBlob(snapshot),day:snapshot.day});return;
  }
  if(data.type==='restore-backup'){
   emit({requestId:data.requestId,replacingWorld:'Restoring previous autosave'});residentWorld=null;releaseCareerBaseline();
   const recovered=await backupCareer({onProgress:loading=>emit({requestId:data.requestId,loading})});ensureCalendarHorizon(recovered);delete recovered.migrationNeedsSave;
   emit({requestId:data.requestId,loading:{stage:'Saving recovered checkpoint'}});await saveCareer(recovered,{replace:true});residentWorld=recovered;emit({requestId:data.requestId,world:recovered,saved:true});return;
  }
  if(data.type==='save-patch'){
   if(!residentWorld)residentWorld=await loadCareer({includeLegacy:false});
   if(!residentWorld){emit({requestId:data.requestId,needsBase:true});return;}
   if(data.expectedRevision!==(residentWorld.storageRevision||0))throw Error('Simulation snapshot differs from the last saved revision. Reload before saving.');
   const next=applyWorldPatch(residentWorld,data.patch);const revision=await saveCareer(next,{preparedPatch:data.patch});residentWorld=next;emit({requestId:data.requestId,saved:true,revision});return;
  }
  if(data.type==='save'){const revision=await saveCareer(data.world);residentWorld=data.world;emit({requestId:data.requestId,saved:true,revision});return;}
  const world=data.type==='create'?createWorld(data.config):data.type==='import'?(data.file?await importCareerFile(data.file):decode(data.text)):data.world||residentWorld;
  if(data.type==='import'||data.type==='restore')ensureCalendarHorizon(world);
  if(data.type==='import'&&!world.pedigreeHistoryVersion&&world.settings.historyYears>0)seedPedigreeCareers(world);
  if(data.type==='advance'||!data.type){
   if(world)base=patchBase(world);
   if(!world)throw Error('Reload the saved career before advancing.');
   if(data.expectedRevision!=null&&data.expectedRevision!==(world.storageRevision||0))throw Error('Simulation snapshot differs from the last saved revision. Reload before advancing.');
   if(!Number.isSafeInteger(data.days)||data.days<1||data.days>36000)throw Error('Advance 1–36,000 days at a time.');
   if(!world.studInventoryV6){recruitAccomplishedSires(world);updateStudFees(world);world.studInventoryV6=true;}
   for(let done=0;done<data.days;){
    const chunk=Math.min(cooperative?1:30,data.days-done);advanceWorld(world,chunk);
    if(world.settings.historyYears>0)seedPedigreeCareers(world);
    await saveCareer(world,{initialBase:base});done+=chunk;checkpointWritten=true;
    emit({requestId:data.requestId,progress:{done,total:data.days,day:world.day}});
    if(cooperative)await yieldTask();
   }
  }else await saveCareer(world,{replace:data.type==='create'||data.type==='import'||data.type==='restore'});
  residentWorld=world;emit(base?{requestId:data.requestId,patch:worldPatch(world,base),saved:true}:{requestId:data.requestId,world,saved:true});
 }catch(error){let committed=null;if(checkpointWritten){emit({requestId:data.requestId,recoveringCheckpoint:true});residentWorld=null;base=null;releaseCareerBaseline();try{committed=await loadCareer();}catch{/* Last UI snapshot remains available if storage is inaccessible. */}}residentWorld=committed||(['import','save-patch','export','get-result','horse-history'].includes(data.type)?previousResident:null);emit({requestId:data.requestId,error:error.message,committed});}
}
function yieldTask(){if(globalThis.scheduler?.yield)return scheduler.yield();return new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();c.port2.close();resolve();};c.port2.postMessage(null);});}

