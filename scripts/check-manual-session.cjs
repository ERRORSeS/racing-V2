const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[],crashes=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>crashes.push('crash'));
  await page.goto('http://127.0.0.1:5173/dist/');await page.locator('#import').waitFor();
  const initial=await page.evaluate(async()=>{
   const r=await(await fetch('./release.json')).json(),base=new URL(`./${r.assetBase}/`,location.href).href;
   return new Promise((resolve,reject)=>{
    const script=`import {createWorld,advanceWorld} from '${base}world.js';import {setNpcProgression} from '${base}fast-mode.js';import {saveCareer} from '${base}storage.js';
    const w=createWorld({country:'USA',seed:'manual-aged-career',historyYears:0,creativeMode:true,starters:[{}]});w.settings.injuryFrequency=0;advanceWorld(w,60);setNpcProgression(w,false);advanceWorld(w,720);
    const h=Object.values(w.horses).find(h=>h.owner==='player');h.youngstock.starting.status='not_started';h.youngstock.starting.step=0;h.youngstock.starting.completedDay=null;for(const m of h.youngstock.starting.milestones)m.status='pending';h.autoTrain=false;h.fatigue=0;h.soundness=100;h.clearance='Race-Cleared';h.medicalCase=null;
    await saveCareer(w,{replace:true});self.postMessage({day:w.day,horseId:h.id,horses:Object.keys(w.horses).length,revision:w.storageRevision,speed:h.skills.speed,results:Object.fromEntries(Object.entries(w.results).slice(0,5).map(([id,r])=>[id,JSON.stringify(r)]))});`;
    const url=URL.createObjectURL(new Blob([script],{type:'text/javascript'})),worker=new Worker(url,{type:'module'});worker.onmessage=e=>{worker.terminate();URL.revokeObjectURL(url);resolve(e.data);};worker.onerror=e=>reject(Error(e.message));
   });
  });console.log('Aged fixture',JSON.stringify({day:initial.day,horses:initial.horses}));
  await page.reload();await page.locator(`[data-horse="${initial.horseId}"]`).first().waitFor({timeout:120000});await page.locator(`[data-horse="${initial.horseId}"]`).first().click();
  await page.locator('[data-action="profile-tab"][data-id="Training"]').click();await page.getByRole('button',{name:'Max handling & auto-start',exact:true}).click();
  await page.locator('form[data-form="workout"] [name="activity"]').selectOption('Sprint work');await page.getByRole('button',{name:'Run one chosen workout',exact:true}).click();
  await page.getByRole('button',{name:'Dashboard',exact:true}).click();
  const times=[];for(const name of ['Next day','Next week','Next month']){
   const start=Date.now();await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#advance-status')?.textContent&&/Advanced \d+ days/.test(document.querySelector('.notice')?.textContent||''),{},{timeout:15000});times.push({name,ms:Date.now()-start});
  }
  await page.getByRole('button',{name:'Next day',exact:true}).evaluate(b=>{b.click();b.click();b.click();});await page.waitForFunction(()=>!document.querySelector('#advance-status')?.textContent,{},{timeout:15000});
  const header=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open('first-light-careers',1);q.onsuccess=()=>{const db=q.result,t=db.transaction('snapshots','readonly'),r=t.objectStore('snapshots').get('current');r.onsuccess=()=>resolve({revision:r.result.revision,chunks:r.result.chunks.length});t.oncomplete=()=>db.close();t.onerror=()=>reject(t.error);};}));
  if((await header()).revision!==initial.revision)throw Error('A time skip or edit wrote an automatic checkpoint');
  if(await page.locator('#save-status').textContent()!=='Unsaved changes')throw Error('Missing unsaved-state indicator');
  const saveStart=Date.now();await page.getByRole('button',{name:'Save career',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent==='Saved',{},{timeout:120000});const saveMs=Date.now()-saveStart;
  if((await header()).revision!==initial.revision+1)throw Error('Manual save was missing or duplicated');
  await page.reload();await page.getByRole('button',{name:'Horses',exact:true}).waitFor({timeout:120000});
  const result=await page.evaluate(async initial=>{
   const r=await(await fetch('./release.json')).json(),{loadCareer,validate}=await import(`./${r.assetBase}/storage.js`),w=await loadCareer({compactRuntime:true});validate(w);const h=w.horses[initial.horseId];
   if(w.day!==initial.day+41)throw Error('Queued skips lost or duplicated days: '+w.day);if(h.youngstock.starting.status!=='complete'||!Object.values(h.youngstock.skills).every(v=>v===100)||!h.autoTrain)throw Error('Instant starting did not persist');
   if(h.skills.speed<=initial.speed||!w.sessions.some(s=>s.horseId===h.id&&s.activity==='Sprint work'))throw Error('Manual and automatic training did not progress');
   for(const [id,json]of Object.entries(initial.results))if(JSON.stringify(w.results[id])!==json)throw Error('Historical race changed');return {day:w.day,horses:Object.keys(w.horses).length,speed:h.skills.speed,sessions:w.sessions.filter(s=>s.horseId===h.id).length};
  },initial);
  if(errors.length||crashes.length)throw Error(JSON.stringify({errors,crashes}));console.log(JSON.stringify({...result,times,saveMs,noAutomaticWrites:true,reopened:true,errors,crashes}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
