import { npcConsignmentAllowed } from './catalog-policy.js';
import { rotateAuctions } from './auction-catalog.js';
import { autoRegister } from './auto-register.js';
import { updateForm } from './form.js';
import { youngstockDay, initializeYoungstock, createStartingPlan } from './youngstock.js';
import { updateStudFees, recruitAccomplishedSires } from './stud.js';
import { seedHistory, seedPedigreeCareers } from './history.js';
import { FIELD_DENSITY } from './race-rules.js';
import { processTravel } from './travel.js';
import { monthlyDigest } from './media.js';
import { annualAwards } from './legacy.js';
import { applyStarterOverrides } from './development.js';
import { prepareStarters } from './starters.js';
import { RULES, COUNTRIES, SKILLS, age } from './rules.js';
import { seed, integer, pick, random, id } from './random.js';
import { horse, event, rename, transact } from './core.js';
import { upgrade } from './upgrade.js';
import { schedule, resolveRace, enterRace, eligibility, planNpcEntries, fieldHealth } from './racing.js';
import { train, dailyCare, retire, exposure, scheduledTraining } from './care.js';
import { marketDay, appraisal } from './market.js';
import { cover, foal } from './breeding.js';
export { event, horse, rename, setBalance, phenotype, clearJournal, journal, changeCountry } from './core.js';
export { buy } from './market.js';
export { train } from './care.js';
export function createWorld(config) {
  if([config.stable,config.owner,config.seed].some(value=>/[<>]/.test(String(value||''))))throw Error('Use plain text for owner, stable and seed.');
  if(!COUNTRIES[config.country])throw Error('Choose a supported country.');if(!config.starters?.length)throw Error('Add at least one starter.');
  const w={schema:1,seed:config.seed||'first-light',rng:seed(config.seed||'first-light'),sequence:0,day:0,ownerName:config.owner||'Owner',stableName:config.stable||'First Light Racing',country:config.country,unlimited:config.unlimited??true,balance:'0',horses:{},owners:{player:{name:config.stable||'First Light Racing',country:config.country},archive:{name:'Historical breeding archive',country:config.country}},events:[],ledger:[],listings:[],fixtures:[],sessions:[]};
  // Exact money parser and additive defaults are shared with save migration.
  upgrade(w);w.settings.fatalities=config.fatalities??true;w.settings.expandedGenetics=!!config.expandedGenetics;w.settings.fieldDensity=config.fieldDensity||'Balanced';w.settings.historyYears=config.historyYears??10;w.settings.instantTravel=config.instantTravel??false;w.settings.creativeMode=!!config.creativeMode;w.settings.revealPotential=!!config.revealPotential;
  const catalog=config.catalog?prepareStarters(config.catalog):null;
  const prepared=new Map();
  if(catalog)for(const opts of config.starters.filter(o=>o.catalogId)){
    if(!catalog.ids.includes(opts.catalogId))throw Error('Selected prospect is not in the prepared catalog.');
    function add(id){if(!id||w.horses[id])return;const h=structuredClone(catalog.horses[id]);w.horses[id]=h;add(h.sire);add(h.dam);}
    add(opts.catalogId);prepared.set(opts.catalogId,w.horses[opts.catalogId]);
  }
  for(const c of Object.keys(COUNTRIES))for(let i=0;i<4;i++){
    const owner=id(w,'owner');w.owners[owner]={name:`${c} ${['Oak','Crown','River','Hill'][i]} Racing`,country:c,balance:'5000000000',reputation:50};
    const count=FIELD_DENSITY[w.settings.fieldDensity].activePerStable;
    for(let j=0;j<count+4;j++){
      const breeding=j>=count,born=breeding?-(6+(i+j)%10)*360:j===count-1?-1800:j>=count-2?-1440:j>=count-4?-1080:-720;let parentOptions={};if(c==='USA'&&i===0&&j===count){const sire=deepLine(w,c,born-1800,8),dam=horse(w,'archive',c,{sex:'filly'},1,born-2160);parentOptions={sireId:sire.id,damId:dam.id};}const h=horse(w,owner,c,{...(breeding?{sex:j<count+2?'colt':'filly'}:{}),...parentOptions},1,born);
      if(breeding){h.status='retired';h.brood=true;h.studFee=String(250000+(i+j)%8*250000);}else h.autoTrain=true;
      h.historyRecorded=true;
      if(j===0||j===count-1||j===count+1)w.listings.push({id:id(w,'listing'),horseId:h.id,seller:owner,price:String(RULES.marketPriceBase+integer(w,0,30000000)),sold:false,closed:false,kind:i%2===0?'private':'auction',reserve:'1000000',bids:[],day:0,endDay:7});
    }
  }
  for(const opts of config.starters){
    for(const k of ['potential','ability','temperament','spookiness'])if(opts[k]!=null&&(!Number.isFinite(opts[k])||opts[k]<0||opts[k]>100))throw Error(`${k} must be 0–100.`);
    if(opts.ability!=null&&opts.potential!=null&&opts.ability>opts.potential)throw Error('Current ability cannot exceed potential.');
    if(opts.tobiano&&!w.settings.expandedGenetics)throw Error('Tobiano requires fictional expanded genetics.');
    let h;
    if(opts.catalogId){h=prepared.get(opts.catalogId);if(!h)throw Error('Prospect identity is missing.');
      const changedStats=opts.potential!==h.potential.speed||opts.ability!==h.skills.speed;
      if(changedStats)for(const k of SKILLS){h.potential[k]=opts.potential;h.skills[k]=opts.ability;}
      h.sex=opts.sex;h.temperament=opts.temperament;h.spookiness=opts.spookiness;h.surface=opts.surface;h.distance=opts.distance;h.location=config.country;
      const oldBase=h.coat.extension==='ee'?'chestnut':h.coat.agouti==='aa'?'black':'bay';
      if(opts.base!==oldBase&&opts.base!=='Random'){h.coat.extension=opts.base==='chestnut'?'ee':'EE';if(opts.base!=='chestnut')h.coat.agouti=opts.base==='black'?'aa':'AA';}
      const changes={};if(opts.base!==oldBase)changes.base=opts.base;if(opts.gray!==h.coat.gray)changes.gray=opts.gray;if(opts.tobiano!==h.coat.tobiano)changes.tobiano=opts.tobiano;if(opts.shade!==h.coat.shade)changes.shade=opts.shade;if(opts.face!==h.coat.face)changes.face=opts.face;if(Object.keys(changes).length)applyStarterOverrides(h,changes);
      h.coat.shade=opts.shade;h.coat.face=opts.face;h.coat.gray=opts.gray;h.coat.grayGene=h.coat.gray?'Gg':'gg';h.coat.tobiano=opts.tobiano;h.coat.tobianoGene=h.coat.tobiano?'Tt':'tt';
    }else h=horse(w,'player',config.country,opts,2);h.historyRecorded=true;if(opts.name&&opts.name!==h.name)rename(w,h.id,opts.name);event(w,'ownership',`${h.name} joins the stable as an unstarted two-year-old.`,h.id);
  }
  if(config.starterEducation==='race_ready'&&!config.creativeMode)throw Error('Already race-ready starters require creative setup.');
  for(const h of Object.values(w.horses).filter(h=>h.owner==='player')){
   if(config.starterEducation==='introduction'){createStartingPlan(w,h);h.autoTrain=true;}
   if(config.starterEducation==='race_ready'){h.youngstock.starting.status='complete';h.youngstock.starting.step=10;h.youngstock.starting.completedDay=0;h.youngstock.starting.provenance='Creative setup: completed starting milestones';for(const m of h.youngstock.starting.milestones){m.status='passed';m.passedDay=0;}}
  }
  upgrade(w);if(w.settings.historyYears>0){seedHistory(w,w.settings.historyYears);seedPedigreeCareers(w);}recruitAccomplishedSires(w);updateStudFees(w);rotateAuctions(w);schedule(w,0);planNpcEntries(w);setInitialBalance(w,config.balance||'1000000');event(w,'world','Career established. International racing, markets and bloodlines are active.');w.careerTimelineVersion=1;return w;
}
import { cents } from './rules.js';
function setInitialBalance(w,balance){w.balance=cents(balance);}
export function hire(w,role) {
  if(!['Trainer','Veterinarian','Farrier'].includes(role))throw Error('Choose a staff role.');if(w.staff.some(s=>s.owner==='player'&&s.role===role))throw Error('This role is already staffed.');
  transact(w,-100000n,'Staff hiring',role);const s={id:id(w,'staff'),owner:'player',role,name:`${pick(w,['Avery','Ellis','Jordan','Riley'])} ${pick(w,['Vale','Brooks','Reed','Stone'])}`,skill:integer(w,65,95),wage:'300000'};w.staff.push(s);event(w,'staff',`${s.name} hired as ${role}. Monthly wage 3,000 USD.`);
}
export function dismiss(w,staffId){const s=w.staff.find(s=>s.id===staffId&&s.owner==='player');if(!s)throw Error('Staff member not found.');w.staff=w.staff.filter(x=>x!==s);event(w,'staff',`${s.name} dismissed.`);}
function npcMonth(w) {
  const stables=Object.entries(w.owners).filter(([key])=>!['player','archive'].includes(key));
  for(const [owner,o] of stables){
    const horses=Object.values(w.horses).filter(h=>h.owner===owner&&h.status!=='deceased');
    for(const h of horses)if(h.status==='active'&&age(h,w.day)>=9){h.status='retired';h.brood=h.sex!=='gelding';h.autoTrain=false;event(w,'life',`${h.name} retired by ${o.name}.`,h.id);}
    if(w.day%360===30){const dam=horses.find(h=>h.brood&&h.sex==='filly'&&!h.pregnancy&&h.postFoalingUntil<=w.day&&age(h,w.day)<19);const sires=Object.values(w.horses).filter(h=>h.brood&&h.sex==='colt'&&h.status==='retired'&&h.location===dam?.location&&!h.medicalCase&&h.soundness>=65&&age(h,w.day)<23);if(dam&&sires.length){try{cover(w,dam.id,pick(w,sires).id,'natural',null,true);}catch{/* Incompatible pairs remain unbred. */}}}
    if(w.day%360===0){const active=horses.filter(h=>h.status==='active').length;if(active<6){const h=horse(w,owner,o.country,{},1,w.day-720);h.autoTrain=true;h.historyRecorded=true;upgrade(w);event(w,'world',`${o.name} introduces new prospect ${h.name}.`,h.id);}}
    if(random(w)<.2){const h=horses.find(h=>h.status==='active'&&npcConsignmentAllowed(w,h)&&!w.listings.some(l=>l.horseId===h.id&&!l.sold&&!l.closed)&&!w.fixtures.some(f=>f.status==='scheduled'&&f.entries.some(e=>e.horseId===h.id)));if(h)w.listings.push({id:id(w,'listing'),horseId:h.id,seller:owner,price:appraisal(w,h),reserve:appraisal(w,h),kind:random(w)<.5?'private':'auction',sold:false,closed:false,day:w.day,endDay:w.day+7,bids:[]});}
    for(const h of horses)if(age(h,w.day)>28&&w.settings.fatalities&&random(w)<.01){h.status='deceased';h.deceasedDay=w.day;h.brood=false;event(w,'life',`${h.name} died in retirement. Their permanent records remain available.`,h.id);}
  }
}
export function advanceWorld(w,days) {
  if(!Number.isSafeInteger(days)||days<1||days>36000)throw Error('Advance 1–36,000 days at a time.');upgrade(w);
  for(let i=0;i<days;i++){
    w.day++;
    for(const c of w.coverings)foal(w,c);
    for(const h of Object.values(w.horses)){youngstockDay(w,h);if(h.owner!=='archive')updateForm(w,h);}
    processTravel(w);
    for(const h of Object.values(w.horses))dailyCare(w,h);
    planNpcEntries(w);autoRegister(w);
    for(const h of Object.values(w.horses)){
      if(h.owner!=='player'&&h.owner!=='archive'&&h.status==='active')h.autoTrain=true;
      if(h.owner!=='archive')scheduledTraining(w,h);
    }
    for(const f of w.fixtures)if(f.day<=w.day&&f.status==='scheduled')resolveRace(w,f.id);
    for(const h of Object.values(w.horses))if(h.owner!=='archive')exposure(w,h,'turnout');
    marketDay(w);
    if(w.day%30===0){
      for(const b of w.freezer)if(b.doses>0)b.viability=Math.max(0,b.viability-.15);
      for(const s of w.staff)if(s.owner==='player'){try{transact(w,-BigInt(s.wage),'Staff wages',s.id);}catch{event(w,'staff',`Wage unpaid for ${s.name}; service suspended.`);s.owner='unpaid';}}
      npcMonth(w);rotateAuctions(w);recruitAccomplishedSires(w);updateStudFees(w);schedule(w,w.day);monthlyDigest(w);if(w.day%360===0)annualAwards(w);

    }
  }
  event(w,'calendar',`Advanced ${days} days; care, training, races, medical plans, markets and pregnancies processed.`);
}


export function setFieldDensity(w,density){
 if(!FIELD_DENSITY[density])throw Error('Choose Sparse, Balanced or Busy.');w.settings.fieldDensity=density;
 const desired=FIELD_DENSITY[density];for(const f of w.fixtures)if(f.status==='scheduled'&&f.day>w.day+1){f.targetFieldSize=desired.target;f.maxRunners=Math.max(12,desired.target);}
 for(const [owner,o]of Object.entries(w.owners)){if(['player','archive'].includes(owner))continue;let active=Object.values(w.horses).filter(h=>h.owner===owner&&h.status==='active').length;while(active<desired.activePerStable){const h=horse(w,owner,o.country,{},1,w.day-720);h.historyRecorded=true;h.autoTrain=true;active++;}}
 planNpcEntries(w);event(w,'world',`NPC field density changed to ${density}; real cohorts and future nomination targets updated.`);
}

function deepLine(w,country,born,depth){if(depth===0)return horse(w,'archive',country,{sex:'colt'},0,born);const sire=deepLine(w,country,born-1800,depth-1),dam=horse(w,'archive',country,{sex:'filly'},0,born-2160),h=horse(w,'archive',country,{sex:'colt',sireId:sire.id,damId:dam.id},0,born);h.status='retired';return h;}
