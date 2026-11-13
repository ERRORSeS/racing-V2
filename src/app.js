import { startHorse, startingSession, educationSession, beginWeaning, setYoungstockCare } from './youngstock.js';
import { mountGuide } from './guide.js';
import { editGenetics, dnaPanel } from './editing.js';
import { LOCI } from './genetics.js';
import { SKILL_IDS } from './skill-definitions.js';
import { putOnBreak, reviewBreak, startTherapy } from './recovery.js';
import { cancelTravel } from './travel.js';
import { markNews, respondToPress } from './media.js';
import { prepareStarters, prospectCards } from './starters.js';
import { COUNTRIES } from './rules.js';
import { createWorld, advanceWorld, buy, setBalance, rename, train, clearJournal, changeCountry, hire, dismiss, setFieldDensity } from './world.js';
import { ownedHorse } from './core.js';
import { setCare, vet, farrier, retire, scheduledTraining } from './care.js';
import { enterRace, scratchRace, travel } from './racing.js';
import { listHorse, bid, withdrawListing, prePurchase } from './market.js';
import { cover, collect, dispose, transferBatch } from './breeding.js';
import { inspect } from './registry.js';
import { saveCareer, loadCareer, backupCareer, encode, decode } from './storage.js';
import { shell, setupView } from './ui.js';

const app=document.querySelector('#app');mountGuide();
let world=null,notice='',busy=false,settingUp=false,replayTimer=null;
let draft={},catalog=prepareStarters(),starters=prospectCards(catalog);
const state={tab:'Dashboard',selected:null,profileStack:[],profileTab:'Overview',query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name',raceCountry:'USA',resultId:null,replayFrame:0,replayPlaying:false,journalArchive:false,breeder:null,damId:null,sireId:null,newsCategory:'All',newsCountry:'All',raceMonth:'Current'};
function render(){document.documentElement.dataset.theme=world?.settings.theme||'light';app.innerHTML=!world||settingUp?setupView({...draft,hasCareer:!!world},starters,notice):shell(world,state,notice,busy);}
function stopReplay(){clearInterval(replayTimer);replayTimer=null;state.replayPlaying=false;}
async function update(action,message='Saved to this browser.') {
  if(busy)return;busy=true;stopReplay();render();
  try {const next=structuredClone(world);await action(next);await saveCareer(next);world=next;notice=message;}
  catch(error){notice=error.message;}finally{busy=false;render();}
}
async function advance(days){
  await update(async next=>{
    if(days<=1){advanceWorld(next,days);return;}
    const result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./time-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data.world);};worker.onerror=error=>{worker.terminate();reject(Error(error.message||'World advancement failed.'));};worker.postMessage({world:next,days});});
    Object.assign(next,result);
  },`Advanced ${days} days and saved all scheduled events.`);
}
function collectSetup(){const f=new FormData(app.querySelector('[data-form="setup"]'));draft={starterEducation:f.get('starterEducation')||'Not started',stable:f.get('stable'),owner:f.get('owner'),country:f.get('country'),seed:f.get('seed'),balance:f.get('balance'),unlimited:f.has('unlimited'),expandedGenetics:f.has('expandedGenetics'),creativeMode:f.has('creativeMode'),revealPotential:f.has('revealPotential'),fieldDensity:f.get('fieldDensity')||'Balanced'};starters=starters.map((s,i)=>({catalogId:s.catalogId,identity:s.identity,selected:f.has(`chosen-${i}`),name:f.get(`name-${i}`),sex:f.get(`sex-${i}`),surface:f.get(`surface-${i}`),distance:Number(f.get(`distance-${i}`)),potential:Number(f.get(`potential-${i}`)),ability:Number(f.get(`ability-${i}`)),temperament:Number(f.get(`temperament-${i}`)),spookiness:Number(f.get(`spookiness-${i}`)),base:f.get(`base-${i}`),shade:f.get(`shade-${i}`),face:f.get(`face-${i}`),gray:f.has(`gray-${i}`),tobiano:f.has(`tobiano-${i}`)}));}
function exportCareer(){const url=URL.createObjectURL(new Blob([encode(world)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`first-light-day-${world.day}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function openHorse(id){if(state.selected)state.profileStack.push({id:state.selected,tab:state.profileTab});state.selected=id;state.profileTab='Overview';stopReplay();render();}
app.addEventListener('click',async e=>{
  if(busy)return;
  const link=e.target.closest('[data-horse]');if(link){e.preventDefault();openHorse(link.dataset.horse);return;}
  const nav=e.target.closest('[data-nav]');if(nav){e.preventDefault();stopReplay();state.tab=nav.dataset.nav;state.selected=null;state.resultId=null;state.profileStack=[];state.query='';state.page=0;render();return;}
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
  if(a==='add'||a==='remove'||a==='regenerate-starters'){collectSetup();if(a==='regenerate-starters'){catalog=prepareStarters({country:draft.country,worldSeed:draft.seed,count:5});starters=prospectCards(catalog);notice='Five new ready prospects generated. Select the horses you want.';}else if(a==='add'){const expanded=prepareStarters({...catalog,count:catalog.count+1});const card=prospectCards(expanded).at(-1);catalog=expanded;starters.push({...card,selected:true});}else starters.splice(Number(b.dataset.index),1);render();return;}
  if(a==='cancel-setup'){settingUp=false;render();return;}
  if(!world&&a==='restore'){try{const recovered=await backupCareer();await saveCareer(recovered);world=recovered;notice='Previous autosave restored.';}catch(error){notice=error.message;}render();return;}
  if(!world)return;
  if(a==='youngstock-profile'){openHorse(id);state.profileTab='Youngstock & Starting';render();return;}
  if(a==='profile'){openHorse(id);return;}
  if(a==='back'){const previous=state.profileStack.pop();if(previous){state.selected=previous.id;state.profileTab=previous.tab;}else state.selected=null;render();return;}
  if(a==='profile-tab'){state.profileTab=id;render();return;}
  if(a==='roster'){state.tab='Horses';state.selected=null;render();return;}
  if(a==='previous'||a==='next'){state.page+=a==='next'?1:-1;render();return;}
  if(a==='result'){state.resultId=id;state.selected=null;state.replayFrame=0;stopReplay();render();return;}
  if(a==='close-result'){stopReplay();state.resultId=null;render();return;}
  if(a==='replay-play'){if(state.replayPlaying)stopReplay();else {state.replayPlaying=true;replayTimer=setInterval(()=>{const r=world.results[state.resultId];if(!r){stopReplay();return;}if(state.replayFrame>=r.frames.length-1){stopReplay();render();return;}state.replayFrame++;render();},650);}render();return;}
  if(a==='replay-reset'){stopReplay();state.replayFrame=0;render();return;}
  if(a==='replay-next'){stopReplay();state.replayFrame=Math.min(state.replayFrame+1,world.results[state.resultId].frames.length-1);render();return;}
  if(a==='journal-archive'){state.journalArchive=!state.journalArchive;render();return;}
  if(a==='breeder-stock'){state.breeder=id;state.query='';state.page=0;render();return;}
  if(a==='export'){exportCareer();return;}
  if(a==='new-career'){exportCareer();settingUp=true;draft={country:world.country,seed:world.seed};catalog=prepareStarters({country:world.country,worldSeed:world.seed});starters=prospectCards(catalog);notice='Your current career was exported. The current save remains until you start the new career.';render();return;}
  if(a==='day'||a==='month'){await advance(a==='day'?1:30);return;}
  const actions={
    interview:n=>respondToPress(n,id,b.dataset.tone),
    'follow-stable':n=>{if(!n.owners[id])throw Error('Stable not found.');n.followedStables=n.followedStables.includes(id)?n.followedStables.filter(x=>x!==id):[...n.followedStables,id];},
    'begin-weaning':n=>beginWeaning(n,id),
    'pause-weaning':n=>{const p=ownedHorse(n,id).youngstock.weaning;if(p.startDay==null||p.stage==='complete')throw Error('No active weaning plan.');p.paused=!p.paused;},
    'pause-starting':n=>{const p=ownedHorse(n,id).youngstock.starting;if(p.status==='complete')throw Error('Starting already complete.');p.status='paused';},
    'starting-session':n=>{if(!startingSession(n,ownedHorse(n,id)))throw Error('Start or resume the plan, or wait for an eligible rested day.');},
    'clear-journal':n=>{clearJournal(n);state.journalArchive=false;},
    'follow-horse':n=>{if(n.followedHorses.includes(id))n.followedHorses=n.followedHorses.filter(x=>x!==id);else n.followedHorses.push(id);},buy:n=>buy(n,id),ppe:n=>prePurchase(n,id),
    auto:n=>{const h=ownedHorse(n,id);if(h.status==='deceased')throw Error('Cannot train a deceased horse.');h.autoTrain=!h.autoTrain;},
    'today-auto':n=>Object.values(n.horses).filter(h=>h.owner==='player').forEach(h=>scheduledTraining(n,h)),
    'all-auto':n=>Object.values(n.horses).filter(h=>h.owner==='player'&&h.status==='active').forEach(h=>h.autoTrain=true),
    'stop-auto':n=>Object.values(n.horses).filter(h=>h.owner==='player').forEach(h=>{h.autoTrain=false;if(h.youngstock)h.youngstock.autoEducation=false;}),
    train:n=>{if(!train(n,ownedHorse(n,id),true))throw Error('Training is paused by rest, recovery, age, fatigue or race preparation.');},
    vet:n=>{ownedHorse(n,id);vet(n,id);},
    rehab:n=>{ownedHorse(n,id);vet(n,id,'rehab');},
    clearance:n=>{ownedHorse(n,id);vet(n,id,'clear');},
    farrier:n=>{ownedHorse(n,id);farrier(n,id);},
    retire:n=>retire(n,id),
    inspect:n=>inspect(n,id),
    dispose:n=>dispose(n,id),
    withdraw:n=>withdrawListing(n,id),
    scratch:n=>scratchRace(n,id,b.dataset.horseId),
    hire:n=>hire(n,id),dismiss:n=>dismiss(n,id),
    'review-break':n=>reviewBreak(n,id),dna:n=>dnaPanel(n,id),'cancel-travel':n=>cancelTravel(n,id),'read-news':n=>markNews(n,id,'read'),'bookmark-news':n=>markNews(n,id,'bookmark'),
    restore:async n=>Object.assign(n,await backupCareer()),
  };
  if(actions[a])await update(actions[a],a==='clear-journal'?'Journal cleared. Permanent histories are preserved.':'Saved to this browser.');
});
app.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;const form=e.target,f=new FormData(form),kind=form.dataset.form,id=form.dataset.id;
  if(kind==='setup'){
    collectSetup();busy=true;render();
    try{const candidate=createWorld({...draft,starterEducation:draft.starterEducation==='Creative race-ready'?'race_ready':draft.starterEducation==='Introduction started'?'introduction':'not_started',catalog:{country:catalog.country,worldSeed:catalog.worldSeed,count:catalog.count},starters:starters.filter(s=>s.selected)});await saveCareer(candidate);world=candidate;settingUp=false;state.raceCountry=world.country;state.tab='Dashboard';state.selected=null;state.resultId=null;state.profileStack=[];state.damId=null;state.sireId=null;notice='Career created and saved.';}catch(error){notice=error.message;}finally{busy=false;render();}return;
  }
  if(!world)return;
  if(kind==='skip'){await advance(Number(f.get('amount'))*({Days:1,Months:30,Years:360}[f.get('unit')]));return;}
  const actions={
    starting:n=>{startHorse(n,id,f.get('pace'));ownedHorse(n,id).autoTrain=true;},
    education:n=>{if(!educationSession(n,ownedHorse(n,id),f.get('activity')))throw Error('Education paused for rest, travel or medical care, or already completed today.');},
    'youngstock-care':n=>setYoungstockCare(n,id,{diet:f.get('diet'),turnoutHours:Number(f.get('turnoutHours')),socialGroup:f.get('socialGroup'),companions:f.getAll('companion'),water:f.has('water'),shelter:f.has('shelter'),autoCare:f.has('autoCare'),autoEducation:f.has('autoEducation'),autoWean:f.has('autoWean')}),
    workout:n=>{const h=ownedHorse(n,id);h.trainingPlan=f.get('activity');if(!train(n,h,true,f.get('activity')))throw Error('This workout is not currently permitted.');},
    break:n=>putOnBreak(n,id,Number(f.get('days')),f.get('reason')),therapy:n=>startTherapy(n,id,Number(f.get('months'))),
    creative:n=>editGenetics(n,id,{loci:Object.fromEntries(Object.keys(LOCI).map(k=>[k,[f.get(`${k}-0`),f.get(`${k}-1`)]])),caps:Object.fromEntries(SKILL_IDS.map(k=>[k,Number(f.get(`cap-${k}`))]))},f.has('acknowledge')),
    rename:n=>rename(n,id,f.get('name')),
    country:n=>{changeCountry(n,f.get('country'));state.raceCountry=f.get('country');},
    settings:n=>{
      if(f.get('balance'))setBalance(n,f.get('balance'));if(!f.has('unlimited')&&BigInt(n.balance)<0n)throw Error('Enter a non-negative custom balance before disabling unlimited funds.');n.unlimited=f.has('unlimited');
      const mode=f.get('registryMode'),injury=Number(f.get('injuryFrequency'));if(!['official','alternative'].includes(mode)||!Number.isFinite(injury)||injury<0||injury>10)throw Error('Invalid simulation settings.');
      if(f.get('fieldDensity')&&f.get('fieldDensity')!==n.settings.fieldDensity)setFieldDensity(n,f.get('fieldDensity'));n.settings.registryMode=mode;n.settings.injuryFrequency=injury;n.settings.theme=f.get('theme');for(const key of ['operatingCosts','instantTravel','avoidCloseBreeding','autoRace','fatalities','expandedGenetics','creativeMode','revealPotential','debug'])n.settings[key]=f.has(key);
    },
    care:n=>setCare(n,id,{feed:f.get('feed'),turnout:Number(f.get('turnout')),bit:f.get('bit'),accessory:f.get('accessory'),autoTravel:f.has('autoTravel'),autoCare:f.has('autoCare'),autoVet:f.has('autoVet'),autoFarrier:f.has('autoFarrier')}),
    travel:n=>travel(n,id,f.get('country')),
    entry:n=>enterRace(n,id,f.get('horseId'),f.get('jockeyId'),f.get('tactic')),
    farrier:n=>{ownedHorse(n,id);farrier(n,id,f.get('shoe'));},
    list:n=>listHorse(n,id,f.get('amount'),f.get('kind')),
    bid:n=>bid(n,id,f.get('amount')),
    cover:n=>cover(n,f.get('damId'),f.get('sireId'),f.get('method'),f.get('batchId')),
    collect:n=>collect(n,f.get('sireId')),batch:n=>transferBatch(n,id,f.get('owner'),f.get('country')),
  };
  if(actions[kind])await update(actions[kind]);
});
app.addEventListener('input',e=>{if(e.target.id==='search'){state.query=e.target.value;state.page=0;const pos=e.target.selectionStart;render();const input=app.querySelector('#search');input.focus();input.setSelectionRange(pos,pos);}});
app.addEventListener('change',async e=>{
  if(e.target.matches('[data-choose]')){const counter=document.querySelector('#selected-count');if(counter)counter.textContent=`${document.querySelectorAll('[data-choose]:checked').length} horses selected`;return;}
  if(e.target.matches('[data-filter]')){state[e.target.name]=e.target.value;state.page=0;render();return;}
  if(e.target.matches('[data-pair]')){const form=e.target.closest('form'),f=new FormData(form);state.damId=f.get('damId');state.sireId=f.get('sireId');render();return;}
  if(e.target.id==='import'&&e.target.files[0]){if(busy)return;const file=e.target.files[0];busy=true;render();try{const candidate=decode(await file.text());if(world)exportCareer();await saveCareer(candidate);world=candidate;state.selected=null;state.resultId=null;state.profileStack=[];state.raceCountry=world.country;notice='Career imported. Previous career was exported first.';}catch(error){notice=error.message;}finally{busy=false;}render();}
});
app.innerHTML='<main><p role="status">Loading your saved career…</p></main>';
try{world=await loadCareer();if(world)state.raceCountry=world.country;}catch(error){notice=`${error.message} Your saved career has not been overwritten. Use Import or restore the previous autosave.`;app.innerHTML=`<main><p role="alert">${notice.replace(/[<>]/g,'')}</p><label>Import career<input id="import" type="file" accept=".json,application/json"></label><button data-action="restore">Restore previous autosave</button></main>`;}
if(world||!notice)render();
