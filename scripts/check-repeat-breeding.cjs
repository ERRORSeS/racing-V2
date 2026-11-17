const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/dist/');await page.locator('#import').waitFor();
  const ids=await page.evaluate(async()=>{
   const r=await(await fetch('./release.json')).json(),b=`./${r.assetBase}/`;
   const {createWorld}=await import(b+'world.js'),{retire}=await import(b+'care.js'),{cover,foal}=await import(b+'breeding.js'),{horse}=await import(b+'core.js'),{saveCareer}=await import(b+'storage.js'),{setNpcProgression}=await import(b+'fast-mode.js');
   const w=createWorld({country:'USA',seed:'repeat-breeding-browser',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'filly'},{sex:'colt'}]});w.settings.avoidCloseBreeding=false;w.settings.injuryFrequency=0;
   const [dam,sire]=Object.values(w.horses).filter(h=>h.owner==='player');for(const h of [dam,sire]){h.born=-1080;retire(w,h.id);}w.rng=1;const c=cover(w,dam.id,sire.id);if(!c.conceived)throw Error('Fixture did not conceive');w.day=c.dueDay;foal(w,c);w.day+=180;sire.location='UK';
   const learner=horse(w,'player','USA',{},0,w.day-720);learner.autoTrain=false;learner.soundness=100;learner.fatigue=0;setNpcProgression(w,false);await saveCareer(w,{replace:true});return {dam:dam.id,sire:sire.id,learner:learner.id,day:w.day};
  });
  await page.reload();await page.getByRole('button',{name:'Breeding',exact:true}).click();
  await page.locator('[name="damId"]').selectOption(ids.dam);await page.locator('[name="sireId"]').selectOption(ids.sire);
  await page.locator('[data-cover-eligibility]').filter({hasText:'Eligible for the selected covering service today'}).waitFor();
  await page.getByRole('button',{name:'Record covering & schedule checks',exact:true}).click();await page.getByRole('button',{name:'Save career',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent==='Saved'&&/covered|Covering/i.test(document.querySelector('[data-cover-feedback]')?.textContent||''));
  await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.locator(`[data-horse="${ids.learner}"]`).first().click();
  await page.locator('[data-action="profile-tab"][data-id="Training"]').click();await page.locator('form[data-form="workout"] [name="activity"]').selectOption('Sprint work');await page.getByRole('button',{name:'Run one chosen workout',exact:true}).click();await page.getByRole('button',{name:'Save career',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent==='Saved');await page.reload();await page.getByRole('button',{name:'Horses',exact:true}).waitFor();
  const result=await page.evaluate(async ids=>{
   const r=await(await fetch('./release.json')).json(),{loadCareer,validate}=await import(`./${r.assetBase}/storage.js`),w=await loadCareer();validate(w);
   const attempts=w.breedingAttempts.filter(a=>a.mareId===ids.dam),sessions=w.sessions.filter(s=>s.horseId===ids.learner);
   if(attempts.length!==2||!sessions.some(s=>s.activity==='Sprint work')||w.horses[ids.learner].youngstock.education.length)throw Error('Covering/workout did not persist');
   return {coverings:attempts.length,adultWorkout:sessions.at(-1).activity,day:w.day,originalFoal:w.pregnancies.find(p=>p.mareId===ids.dam&&p.status==='foaled').liveFoalId};
  },ids);
  if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({...result,errors,reloaded:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
