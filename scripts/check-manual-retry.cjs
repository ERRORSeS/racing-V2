const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.route('**/storage.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(' const deltaBase=',' if(globalThis.failNextManualSave){globalThis.failNextManualSave=false;throw Error("Injected manual save failure");}\n const deltaBase=')});});
  await page.goto('http://127.0.0.1:5173/dist/');await page.locator('#import').waitFor();
  console.log(await page.evaluate(async()=>{
   const r=await(await fetch('./release.json')).json(),b=`./${r.assetBase}/`,{runBackgroundJob}=await import(b+'background-jobs.js'),{patchBase,worldPatch,applyWorldPatch}=await import(b+'world-patch.js'),{actionSnapshot}=await import(b+'action-snapshot.js'),{hydrateDisplayArchive}=await import(b+'ui-snapshot.js'),{autoStartHorse}=await import(b+'youngstock.js'),{loadCareer,validate}=await import(b+'storage.js');
   let sequence=0;const job=async data=>{const messages=[];await runBackgroundJob({requestId:++sequence,uiView:true,...data},m=>messages.push(m));return {last:messages.at(-1),messages};};
   let result=await job({type:'create',config:{country:'USA',seed:'manual-retry',historyYears:0,creativeMode:true,starters:[{}]}}),view=hydrateDisplayArchive(result.last.world),base=patchBase(view,{identity:true,fast:true});
   const id=Object.values(view.horses).find(h=>h.owner==='player').id,next=actionSnapshot(view,{horseIds:[id]});next.settings.npcProgression=false;autoStartHorse(next,id);
   result=await job({type:'advance',days:7,manualSave:true,expectedRevision:view.storageRevision,expectedDay:view.day,patch:worldPatch(next,base)});if(result.last.error)throw Error(result.last.error);if(result.messages.some(m=>m.saving))throw Error('Advance tried to save');view=applyWorldPatch(next,result.last.patch);base=patchBase(view,{identity:true,fast:true});
   const edited=actionSnapshot(view,{horseIds:[id]});edited.events.push({id:'manual-retry-event',day:view.day,type:'journal',horseId:id,text:'One event after retry'});
   const request={type:'manual-save',manualSave:true,expectedRevision:view.storageRevision,expectedDay:view.day,patch:worldPatch(edited,base)};
   globalThis.failNextManualSave=true;result=await job(request);if(!/Injected/.test(result.last.error||''))throw Error('Failure injection not reached');result=await job(request);if(result.last.error)throw Error(result.last.error);
   view=edited;view.storageRevision=result.last.revision;base=patchBase(view,{identity:true,fast:true});
   // Resume the real NPC engine, retain its unsaved changes and explicitly save.
   const live=actionSnapshot(view,{horseIds:[]});live.settings.npcProgression=true;result=await job({type:'advance',days:1,manualSave:true,expectedRevision:view.storageRevision,expectedDay:view.day,patch:worldPatch(live,base)});if(result.last.error)throw Error(result.last.error);view=applyWorldPatch(live,result.last.patch);base=patchBase(view,{identity:true});
   result=await job({type:'manual-save',manualSave:true,expectedRevision:view.storageRevision,expectedDay:view.day,patch:worldPatch(view,base)});if(result.last.error)throw Error(result.last.error);
   const saved=await loadCareer();validate(saved);if(saved.day!==8||saved.events.filter(e=>e.id==='manual-retry-event').length!==1||!saved.horses[id].autoTrain)throw Error('Session data lost or duplicated');
   const npc=Object.values(view.horses).find(h=>!['player','archive'].includes(h.owner));if(JSON.stringify(saved.horses[npc.id].skills)!==JSON.stringify(npc.skills))throw Error('Live NPC changes were lost in manual saving');
   return {day:saved.day,revision:saved.storageRevision,saveRetryIdempotent:true,unsavedLiveNpcChangesRetained:true};
  }));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
