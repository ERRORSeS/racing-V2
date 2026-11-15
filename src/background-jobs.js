import { ensureCalendarHorizon } from './race-catalog.js';
import { patchBase, worldPatch, applyWorldPatch } from './world-patch.js';
import { recruitAccomplishedSires, updateStudFees } from './stud.js';
import { seedPedigreeCareers } from './history.js';
import { advanceWorld, createWorld } from './world.js';
import { saveCareer, loadCareer, backupCareer, exportCareerBlob, releaseCareerBaseline, decode, importCareerFile } from './storage.js';
let residentWorld=null;
export async function runBackgroundJob(data,send,{cooperative=false}={}){
 const previousResident=['import','save-patch','export'].includes(data.type)?residentWorld:null;
 let checkpointWritten=false,base=null;
 try{
  if(data.type==='load'){
   const onProgress=loading=>send({requestId:data.requestId,loading});let world=await loadCareer({onProgress,includeLegacy:false}),needsSave=false;
   if(!world&&data.legacyText){onProgress({stage:'Reading legacy saved career'});world=decode(data.legacyText);world.storageRevision=0;needsSave=true;}
   if(world){needsSave=ensureCalendarHorizon(world)||!!world.migrationNeedsSave||needsSave;delete world.migrationNeedsSave;}
   // Startup is read-only: show the career before any migration write or optional
   // historical simulation. The UI queues necessary writes after it is usable.
   residentWorld=world;send({requestId:data.requestId,world,needsSave});return;
  }
  if(data.type==='export'){
   const source=data.world||residentWorld;if(!source){send({requestId:data.requestId,needsBase:true});return;}
   if(data.patch&&data.expectedRevision!==(source.storageRevision||0))throw Error('The backup snapshot has changed. Retry exporting.');
   const snapshot=data.patch?applyWorldPatch(source,data.patch):source;send({requestId:data.requestId,blob:exportCareerBlob(snapshot),day:snapshot.day});return;
  }
  if(data.type==='restore-backup'){
   send({requestId:data.requestId,replacingWorld:'Restoring previous autosave'});residentWorld=null;releaseCareerBaseline();
   const recovered=await backupCareer({onProgress:loading=>send({requestId:data.requestId,loading})});ensureCalendarHorizon(recovered);delete recovered.migrationNeedsSave;
   send({requestId:data.requestId,loading:{stage:'Saving recovered checkpoint'}});await saveCareer(recovered,{replace:true});residentWorld=recovered;send({requestId:data.requestId,world:recovered,saved:true});return;
  }
  if(data.type==='save-patch'){
   if(!residentWorld){send({requestId:data.requestId,needsBase:true});return;}
   if(data.expectedRevision!==(residentWorld.storageRevision||0))throw Error('Simulation snapshot differs from the last saved revision. Reload before saving.');
   const next=applyWorldPatch(residentWorld,data.patch);const revision=await saveCareer(next,{preparedPatch:data.patch});residentWorld=next;send({requestId:data.requestId,saved:true,revision});return;
  }
  if(data.type==='save'){const revision=await saveCareer(data.world);residentWorld=data.world;send({requestId:data.requestId,saved:true,revision});return;}
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
    send({requestId:data.requestId,progress:{done,total:data.days,day:world.day}});
    if(cooperative)await yieldTask();
   }
  }else await saveCareer(world,{replace:data.type==='create'||data.type==='import'||data.type==='restore'});
  residentWorld=world;send(base?{requestId:data.requestId,patch:worldPatch(world,base),saved:true}:{requestId:data.requestId,world,saved:true});
 }catch(error){let committed=null;if(checkpointWritten){send({requestId:data.requestId,replacingWorld:'Reopening the last saved checkpoint'});residentWorld=null;base=null;releaseCareerBaseline();try{committed=await loadCareer();}catch{/* Last UI snapshot remains available if storage is inaccessible. */}}residentWorld=committed||(['import','save-patch','export'].includes(data.type)?previousResident:null);send({requestId:data.requestId,error:error.message,committed});}
}
function yieldTask(){if(globalThis.scheduler?.yield)return scheduler.yield();return new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();c.port2.close();resolve();};c.port2.postMessage(null);});}

