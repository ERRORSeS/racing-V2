import {fastMode,beginFastSkip,inheritFastChanges,markFastHorse} from './fast-mode.js';
import {packRaceArchives,fullRecordedResult} from './immutable-race-archive.js';
import {packArchivedFields} from './archive-fields.js';
import {compactWorld,compactPatch} from './ui-snapshot.js';
import { ensureCalendarHorizon } from './race-catalog.js';
import { patchBase, worldPatch, applyWorldPatch } from './world-patch.js';
import { recruitAccomplishedSires, updateStudFees } from './stud.js';
import { seedPedigreeCareers } from './history.js';
import { advanceSteps, createWorld } from './world.js';
import { saveCareer, loadCareer, backupCareer, exportCareerBlob, releaseCareerBaseline, decode, importCareerFile } from './storage.js';
let residentWorld=null,manualBase=null,manualNeedsFull=false;
export async function runBackgroundJob(data,send,{cooperative=false}={}){
 const emit=message=>{if(data.uiView){if(message.world)message.world=compactWorld(message.world);if(message.committed)message.committed=compactWorld(message.committed);if(message.session)message.session=compactWorld(message.session);if(message.patch)message.patch=compactPatch(message.patch,residentWorld);}else{for(const key of ['world','committed','session','patch'])if(message[key])message[key]=fullTransfer(message[key]);}send(message);};
 const previousResident=['import','save-patch','export','get-result','horse-history'].includes(data.type)?residentWorld:null;
 let checkpointWritten=false,base=null,reopened=false,world=null,manualPrevious=null;
 try{
  if(data.type==='load'){manualBase=null;manualNeedsFull=false;
   const onProgress=loading=>emit({requestId:data.requestId,loading});let world=await loadCareer({compactRuntime:true,onProgress,includeLegacy:false}),needsSave=false;
   if(!world&&data.legacyText){onProgress({stage:'Reading legacy saved career'});world=decode(data.legacyText);world.storageRevision=0;needsSave=true;}
   if(world&&fastMode(world))manualBase=patchBase(world,{fast:true});
   if(world){needsSave=ensureCalendarHorizon(world)||!!world.migrationNeedsSave||needsSave;delete world.migrationNeedsSave;}
   // Startup is read-only: show the career before any migration write or optional
   // historical simulation. The UI marks necessary changes as pending until an explicit save.
   if(world)packRuntime(world);residentWorld=world;emit({requestId:data.requestId,loading:{stage:'Preparing stable display'}});emit({requestId:data.requestId,world,needsSave});return;
  }
  if(data.type==='get-result'||data.type==='horse-history'){
   if(!residentWorld)residentWorld=await loadCareer({compactRuntime:true,includeLegacy:false});
   if(!residentWorld||residentWorld.seed!==data.seed)throw Error('Reload the saved career before opening this archive.');
   if(data.type==='get-result'){const result=residentWorld.results[data.id];if(!result)throw Error('This result is unavailable in the current checkpoint.');emit({requestId:data.requestId,result:fullRecordedResult(result)});}
   else emit({requestId:data.requestId,events:residentWorld.events.filter(e=>e.horseId===data.id)});return;
  }
  if(data.type==='export'){
   if(!residentWorld&&!data.world)residentWorld=await loadCareer({compactRuntime:true,includeLegacy:false});const source=data.world||residentWorld;if(!source){emit({requestId:data.requestId,needsBase:true});return;}
   if(data.patch&&data.expectedRevision!==(source.storageRevision||0))throw Error('The backup snapshot has changed. Retry exporting.');
   const snapshot=data.patch?applyWorldPatch(source,data.patch):source;emit({requestId:data.requestId,blob:exportCareerBlob(snapshot),day:snapshot.day});return;
  }
  if(data.type==='restore-backup'){
   emit({requestId:data.requestId,replacingWorld:'Restoring previous autosave'});residentWorld=null;releaseCareerBaseline();
   const recovered=await backupCareer({compactRuntime:true,onProgress:loading=>emit({requestId:data.requestId,loading})});ensureCalendarHorizon(recovered);delete recovered.migrationNeedsSave;
   emit({requestId:data.requestId,loading:{stage:'Saving recovered checkpoint'}});await saveCareer(recovered,{replace:true});residentWorld=recovered;emit({requestId:data.requestId,world:recovered,saved:true});return;
  }
  if(data.manualSave){
   if(!residentWorld)residentWorld=await loadCareer({compactRuntime:true,includeLegacy:false});
   if(!residentWorld)throw Error('Load a career before using manual saving.');
   if(data.expectedRevision!==(residentWorld.storageRevision||0)||data.expectedDay!==residentWorld.day)throw Error('The session differs from the open career. Keep this page open; the saved checkpoint is unchanged.');
   if(!fastMode(residentWorld)&&data.patch?.settings?.npcProgression!==false)manualNeedsFull=true;
   if(!manualNeedsFull&&!manualBase&&(fastMode(residentWorld)||data.patch?.settings?.npcProgression===false))manualBase=patchBase(residentWorld,{fast:true});
   manualPrevious=residentWorld;
   if(data.patch){const next=inheritFastChanges(residentWorld,applyWorldPatch(residentWorld,data.patch));for(const id of Object.keys(data.patch.horses))markFastHorse(next,id);residentWorld=packRuntime(next);}
   if(!fastMode(residentWorld))manualNeedsFull=true;
   if(data.type==='manual-save'){
    const revision=await saveCareer(residentWorld,{initialBase:manualBase,forceFull:manualNeedsFull,onProgress:saving=>emit({requestId:data.requestId,saving})});manualBase=null;manualNeedsFull=false;if(fastMode(residentWorld))beginFastSkip(residentWorld);emit({requestId:data.requestId,saved:true,revision});return;
   }
  }
  if(data.type==='save-patch'){
   if(!residentWorld)residentWorld=await loadCareer({compactRuntime:true,includeLegacy:false});
   if(!residentWorld){emit({requestId:data.requestId,needsBase:true});return;}
   if(data.expectedRevision!==(residentWorld.storageRevision||0))throw Error('Simulation snapshot differs from the last saved revision. Reload before saving.');
   const next=packRuntime(applyWorldPatch(residentWorld,data.patch));const revision=await saveCareer(next,{preparedPatch:data.patch,previousWorld:residentWorld,onProgress:saving=>emit({requestId:data.requestId,saving})});residentWorld=next;emit({requestId:data.requestId,saved:true,revision});return;
  }
  if(data.type==='save'){const revision=await saveCareer(data.world);residentWorld=data.world;emit({requestId:data.requestId,saved:true,revision});return;}
  if((data.type==='advance'||!data.type)&&!data.world&&!residentWorld){emit({requestId:data.requestId,recoveringCheckpoint:true});residentWorld=await loadCareer({compactRuntime:true,includeLegacy:false,onProgress:loading=>emit({requestId:data.requestId,loading})});reopened=!!residentWorld;}
  world=data.type==='create'?createWorld(data.config):data.type==='import'?(data.file?await importCareerFile(data.file):decode(data.text)):data.world||residentWorld;
  if(data.type==='import'||data.type==='restore')ensureCalendarHorizon(world);
  if(data.type==='import'&&!world.pedigreeHistoryVersion&&world.settings.historyYears>0)seedPedigreeCareers(world);
  if(world)packRuntime(world);
  if(data.type==='advance'||!data.type){
   if(world){if(fastMode(world))beginFastSkip(world,{retainChanges:!!data.manualSave});base=patchBase(world,{fast:fastMode(world)});}
   if(!world)throw Error('Reload the saved career before advancing.');
   if(data.expectedRevision!=null&&data.expectedRevision!==(world.storageRevision||0)){const error=Error(reopened?'The latest saved checkpoint has been restored. Check the date, then click advance again.':'Simulation snapshot differs from the last saved revision. Reload before advancing.');if(reopened)error.committed=world;throw error;}
   if(!Number.isSafeInteger(data.days)||data.days<1||data.days>36000)throw Error('Advance 1–36,000 days at a time.');
   if(!fastMode(world)&&!world.studInventoryV6){recruitAccomplishedSires(world);updateStudFees(world);world.studInventoryV6=true;}
   for(let done=0;done<data.days;){
    const chunk=Math.min(cooperative?1:30,data.days-done),startDay=world.day;for(const day of advanceSteps(world,chunk)){if(!fastMode(world))packRuntime(world);emit({requestId:data.requestId,simulating:{done:done+day-startDay,total:data.days,day}});if(!fastMode(world))await yieldTask();}
    if(!fastMode(world)&&world.settings.historyYears>0)seedPedigreeCareers(world);
    if(!data.manualSave){await saveCareer(world,{initialBase:base,onProgress:saving=>emit({requestId:data.requestId,saving})});checkpointWritten=true;}done+=chunk;
    emit({requestId:data.requestId,progress:{done,total:data.days,day:world.day,saved:!data.manualSave}});
    if(cooperative)await yieldTask();
   }
  }else await saveCareer(world,{replace:data.type==='create'||data.type==='import'||data.type==='restore'});
  residentWorld=world;emit(base?{requestId:data.requestId,patch:worldPatch(world,base),saved:!data.manualSave}:{requestId:data.requestId,world,saved:true});
 }catch(error){if(data.manualSave){residentWorld=world||manualPrevious||residentWorld;emit({requestId:data.requestId,error:error.message,...(world?{session:world}:{})});return;}let committed=error.committed||null;if(checkpointWritten){emit({requestId:data.requestId,recoveringCheckpoint:true});residentWorld=null;world=null;base=null;releaseCareerBaseline();try{committed=await loadCareer({compactRuntime:true});}catch{/* Last UI snapshot remains available if storage is inaccessible. */}}if(committed)packRuntime(committed);residentWorld=committed||(['import','save-patch','export','get-result','horse-history'].includes(data.type)?previousResident:null);emit({requestId:data.requestId,error:error.message,committed});}
}
function yieldTask(){if(globalThis.scheduler?.yield)return scheduler.yield();return new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();c.port2.close();resolve();};c.port2.postMessage(null);});}


function fullTransfer(snapshot){return {...snapshot,horses:Object.fromEntries(Object.entries(snapshot.horses).map(([id,h])=>{const next=typeof h.toJSON==='function'?h.toJSON():{...h};if(next.starts)next.starts=next.starts.map(fullRecordedResult);return [id,next];})),results:Object.fromEntries(Object.entries(snapshot.results).map(([id,r])=>[id,fullRecordedResult(r)]))};}

function packRuntime(w){if(fastMode(w))return w;return packRaceArchives(packArchivedFields(w,null,Object.keys(w.horses).length>=9000));}
