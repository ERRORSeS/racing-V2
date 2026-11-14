import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, advanceWorld } from '../src/world.js';
import { horse } from '../src/core.js';
import { hands, chronologicalDays, lifeStage, startHorse, startingSession, educationSession, beginWeaning, setYoungstockCare, youngstockDay, weaningReadiness } from '../src/youngstock.js';
import { eligibility, enterRace } from '../src/racing.js';
import { renewCalendar } from '../src/race-catalog.js';
import { injure, train } from '../src/care.js';
import { encode,decode } from '../src/storage.js';
import { initializeForm, formFactor, updateForm } from '../src/form.js';
import { GUIDE_PAGES,guideSearch } from '../src/guide.js';
import { shell } from '../src/ui.js';
let baseline;
const make=()=>{baseline??=createWorld({country:'USA',historyYears:0,seed:'v5-regression',starters:[{sex:'filly'}]});return structuredClone(baseline);};
const player=w=>Object.values(w.horses).find(h=>h.owner==='player');
function foalFixture(w){const dam=player(w),sire=Object.values(w.horses).find(h=>h.sex==='colt'&&h.born<-1800);return horse(w,'player','USA',{sireId:sire.id,damId:dam.id},0,w.day);}

test('V4 73–76: four six-race meetings, juvenile routes, two-month preview, idempotent renewal and booked fixtures retained',()=>{
 const w=make(),local=w.fixtures.filter(f=>f.country==='USA'&&f.day<30);assert.equal(local.filter(f=>f.templateVersion===4).length,24);assert.equal(new Set(local.map(f=>f.meetingId)).size,4);assert.ok(local.filter(f=>f.classId==='maiden'&&f.maxAge===2).length>=4);
 const future=w.fixtures.find(f=>f.country==='USA'&&f.day>30),before=structuredClone(future);renewCalendar(w);assert.deepEqual(w.fixtures.find(f=>f.id===future.id),before);assert.equal(w.fixtures.filter(f=>f.templateVersion===4).length,384);assert.ok(w.fixtures.some(f=>f.templateVersion===7&&f.classId==='handicap'));
 w.day=30;renewCalendar(w);assert.deepEqual(w.fixtures.find(f=>f.id===future.id),before);assert.equal(new Set(w.fixtures.map(f=>f.id)).size,w.fixtures.length);assert.ok(w.fixtures.some(f=>f.day>=60));assert.equal(new Set(w.calendarGenerationLog.map(l=>l.key)).size,w.calendarGenerationLog.length);
});
test('V5 118–120/129/131: starters remain two, require actual education, official birthday cannot bypass chronology',()=>{
 const w=make(),h=player(w),f=w.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden');assert.equal(chronologicalDays(h,0),720);assert.equal(h.starts.length,0);assert.equal(h.youngstock.starting.status,'not_started');assert.match(eligibility(w,h,f),/Starting incomplete/);
 h.born=-700;assert.throws(()=>startHorse(w,h.id),/24 chronological/);h.born=-720;startHorse(w,h.id);assert.equal(h.youngstock.starting.status,'active');assert.match(eligibility(w,h,f),/Readiness/);
});
test('V5 117/121/122/128: inherited stature, mare link and dated handling survive export without changing genetic caps',()=>{
 const w=make(),h=foalFixture(w),caps=structuredClone(h.potential),genome=structuredClone(h.genome);assert.equal(h.born,0);assert.equal(h.starts.length,0);assert.equal(h.youngstock.weaning.stage,'nursing');assert.ok(h.youngstock.companions.includes(h.dam));assert.ok(h.height.measurements.some(m=>m.source==='birth'));
 w.day=45;assert.equal(educationSession(w,h,'leading'),true);assert.ok(h.youngstock.skills.leading>10);assert.deepEqual(h.potential,caps);assert.deepEqual(h.genome,genome);assert.deepEqual(decode(encode(w)),w);
 assert.throws(()=>startHorse(w,h.id),/24 chronological/);assert.match(eligibility(w,h,w.fixtures.find(f=>f.day>w.day)),/24 chronological/);
});
test('V5 123/124/126: gradual weaning checks real companions, pauses on unmet care, finishes through three timed stages',()=>{
 const w=make(),h=foalFixture(w);w.day=210;h.youngstock.independentEating=85;h.youngstock.autoCare=false;h.youngstock.autoWean=false;assert.ok(weaningReadiness(w,h).some(r=>r.includes('companion')));assert.throws(()=>beginWeaning(w,h.id),/companion/);
 const companion=player(w); // dam alone is deliberately insufficient
 const other=horse(w,'player','USA',{},0,-1080);setYoungstockCare(w,h.id,{diet:'Growing horse ration',turnoutHours:8,socialGroup:'Familiar group',companions:[companion.id,other.id],water:true,shelter:true,autoCare:false,autoEducation:true,autoWean:false});beginWeaning(w,h.id);assert.equal(h.youngstock.weaning.stage,'preparing');
 w.day=220;youngstockDay(w,h);assert.equal(h.youngstock.weaning.stage,'gradual_transition');h.youngstock.water=false;w.day=230;youngstockDay(w,h);assert.equal(h.youngstock.weaning.stage,'gradual_transition');h.youngstock.water=true;w.day=231;youngstockDay(w,h);assert.equal(h.youngstock.weaning.stage,'monitoring');w.day=241;youngstockDay(w,h);assert.equal(h.youngstock.weaning.stage,'complete');assert.equal(lifeStage(h,w.day),'Weanling');
 h.born=w.day-10;assert.throws(()=>setYoungstockCare(w,h.id,{diet:'Starting ration'}),/dependent foal/);
});
test('V5 130–135: starting milestones persist, sensitive gates take extra work and medical pauses retain passed work',()=>{
 const w=make(),h=player(w);w.settings.injuryFrequency=0;h.spookiness=90;startHorse(w,h.id,'Sensitive');const caps=structuredClone(h.potential);
 for(let day=1;day<=50&&h.youngstock.starting.status!=='complete';day++){w.day=day;h.fatigue=0;startingSession(w,h);}
 assert.equal(h.youngstock.starting.status,'complete');assert.equal(h.youngstock.starting.step,10);assert.equal(h.youngstock.starting.milestones[6].attempts,5);assert.equal(h.starts.length,0);assert.deepEqual(h.potential,caps);assert.deepEqual(decode(encode(w)).horses[h.id].youngstock,h.youngstock);
 const b=make(),unstarted=player(b);startHorse(b,unstarted.id);b.day=1;assert.equal(train(b,unstarted,true),true);assert.match(b.sessions.at(-1).activity,/Starting/);const passed=structuredClone(unstarted.youngstock.starting.milestones);injure(b,unstarted,'Easy');b.day=2;assert.equal(startingSession(b,unstarted),false);assert.equal(unstarted.youngstock.starting.status,'blocked_medical');assert.deepEqual(unstarted.youngstock.starting.milestones,passed);
});
test('V5 132/134: daily auto starting completes then permits a real populated maiden',()=>{
 const w=make(),h=player(w);w.settings.injuryFrequency=0;startHorse(w,h.id);h.autoTrain=true;advanceWorld(w,30);assert.equal(h.youngstock.starting.status,'complete');const f=w.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden'&&!eligibility(w,h,f));assert.ok(f);const j=w.jockeys.find(j=>!w.fixtures.some(x=>x.day===f.day&&x.entries.some(e=>e.jockeyId===j.id)));enterRace(w,f.id,h.id,j.id);advanceWorld(w,f.day-w.day);assert.equal(f.status,'completed');assert.equal(h.starts.length,1);assert.ok(w.results[f.resultId].rows.length>=2);assert.equal(w.results[f.resultId].fixtureId,f.id);
});
test('V5 136–139: hands notation carries correctly and inherited growth stabilizes without talent changes',()=>{
 assert.equal(hands(Math.round(67*25.4)),'16.3 hh');assert.equal(hands(Math.round(68*25.4)),'17.0 hh');const w=make(),h=foalFixture(w),caps=structuredClone(h.potential),birth=h.height.currentMm;w.day=360;youngstockDay(w,h);assert.ok(h.height.currentMm>birth);w.day=1440;youngstockDay(w,h);assert.equal(h.height.currentMm,h.height.geneticMatureMm);w.day=2000;youngstockDay(w,h);assert.equal(h.height.currentMm,h.height.geneticMatureMm);assert.deepEqual(h.potential,caps);assert.ok(Object.values(w.horses).every(h=>h.height));
});
test('V4 90–92: persistent correlated form, centered reliable vs erratic spread and unmodified genetic ceilings',()=>{
 const w=make(),h=player(w);initializeForm(w,h);const caps=structuredClone(h.potential);h.reliability.dailyVolatility=.025;let reliable=[],erratic=[];for(let i=0;i<2000;i++)reliable.push(formFactor(w,h,'sample'+i));h.reliability.dailyVolatility=.16;for(let i=0;i<2000;i++)erratic.push(formFactor(w,h,'sample'+i));const variance=xs=>xs.reduce((n,x)=>n+(x-1)**2,0)/xs.length;assert.ok(variance(erratic)>variance(reliable)*20);assert.ok(Math.abs(erratic.reduce((a,b)=>a+b,0)/erratic.length-1)<.01);w.day=28;updateForm(w,h);const saved=decode(encode(w));assert.equal(formFactor(w,h,'same'),formFactor(saved,saved.horses[h.id],'same'));assert.deepEqual(h.potential,caps);
});
test('V5 141/150: connected profile and care controls, searchable engine-derived education guide',()=>{
 const w=make(),h=player(w),state={tab:'Horses',selected:h.id,profileTab:'Youngstock & Starting',profileStack:[],query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name'};const html=shell(w,state,'');assert.match(html,/data-form="starting"/);assert.match(html,/Growth & life stage/);assert.match(html,/data-form="education"/);assert.ok(GUIDE_PAGES.Weaning);assert.ok(guideSearch('chronological').length);assert.ok(guideSearch('halter').length);assert.ok(shell(w,{...state,selected:null,tab:'Dashboard'},'').includes('aria-label="World and tools"'));
});

test('V5 142/143/148: factual press is deduplicated and interviews never rewrite a result or genetic caps',async()=>{
 const {publishRace,respondToPress}=await import('../src/media.js');const w=make(),h=player(w),race={id:'test-press-result',day:0,title:'Verified test stakes',classId:'listed',country:'USA',track:'Test course',surface:'dirt',distance:1600,tier:4,rows:[{horseId:h.id,name:h.name,owner:'player',time:100,place:1,prize:'75000000'}]};w.results[race.id]=race;const caps=structuredClone(h.potential),snapshot=JSON.stringify(race);publishRace(w,race);publishRace(w,race);assert.equal(w.news.filter(n=>n.resultId===race.id).length,1);const story=w.news.find(n=>n.resultId===race.id);respondToPress(w,story.id,'Credit the team');assert.throws(()=>respondToPress(w,story.id,'Focus on the horse'),/already/);assert.equal(JSON.stringify(race),snapshot);assert.deepEqual(h.potential,caps);assert.equal(w.pressResponses.length,1);assert.equal(w.owners.player.reputation,50.25);assert.throws(()=>respondToPress(w,'nonexistent','Credit the team'));
});

test('Manual groundwork without Auto Training preserves unstarted status and athletic caps',()=>{const w=make(),h=player(w),skills=structuredClone(h.skills),caps=structuredClone(h.potential);w.day=1;assert.equal(train(w,h),true);assert.equal(h.youngstock.starting.status,'not_started');assert.equal(h.youngstock.education.length,1);assert.deepEqual(h.skills,skills);assert.deepEqual(h.potential,caps);});

test('Auto Training starts an eligible horse without Start Horse, persists and completes the program',()=>{
 const w=make(),h=player(w);w.settings.injuryFrequency=0;h.autoTrain=true;
 advanceWorld(w,1);assert.equal(h.youngstock.starting.status,'active');assert.equal(h.youngstock.starting.startDay,1);assert.equal(h.youngstock.starting.milestones[0].attempts,1);assert.match(w.sessions.find(s=>s.horseId===h.id).activity,/Starting:/);
 const restored=decode(encode(w)),copy=restored.horses[h.id];advanceWorld(restored,39);assert.equal(copy.youngstock.starting.status,'complete');assert.equal(copy.youngstock.starting.step,10);assert.equal(copy.starts.length,0);assert.equal(new Set(restored.sessions.filter(s=>s.horseId===h.id).map(s=>s.day)).size,restored.sessions.filter(s=>s.horseId===h.id).length);
});
test('Auto starting respects age, medical clearance and an explicit pause',async()=>{
 const {scheduledTraining,trainingStatus}=await import('../src/care.js');const w=make(),h=player(w);h.autoTrain=true;h.born=-719;w.day=0;assert.equal(h.youngstock.starting.status,'not_started');w.day=1;h.born=-718;scheduledTraining(w,h);assert.equal(h.youngstock.starting.status,'not_started');assert.equal(h.youngstock.education.length,1);
 w.day=3;h.clearance='Controlled Light Work';assert.equal(train(w,h),false);assert.equal(h.youngstock.starting.status,'not_started');assert.match(trainingStatus(w,h),/clearance/);h.clearance='Race-Cleared';scheduledTraining(w,h);assert.equal(h.youngstock.starting.status,'active');h.youngstock.starting.status='paused';w.day=5;const log=structuredClone(h.youngstock.starting.log);scheduledTraining(w,h);assert.equal(h.youngstock.starting.status,'paused');assert.deepEqual(h.youngstock.starting.log,log);assert.match(trainingStatus(w,h),/resume/);
});
test('Manual Start enables daily progress and explains rest days and duplicate sessions',async()=>{
 const {startingSessionReason}=await import('../src/youngstock.js');const w=make(),h=player(w);assert.equal(h.autoTrain,false);startHorse(w,h.id);assert.equal(h.autoTrain,true);assert.match(startingSessionReason(w,h),/rest day/);w.day=1;assert.equal(startingSessionReason(w,h),null);assert.equal(startingSession(w,h),true);assert.match(startingSessionReason(w,h),/already completed/);assert.equal(startingSession(w,h),false);
});

test('Every management and world destination has a visible navigation button and renders its route',async()=>{const {NAV,WORLD_NAV}=await import('../src/ui.js');const w=make(),state={tab:'Dashboard',selected:null,profileStack:[],query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name',raceCountry:'USA'};const html=shell(w,state,'');assert.equal(NAV.length,12);for(const route of [...NAV,...WORLD_NAV.map(([route])=>route)]){assert.ok(html.includes(`data-nav="${route}" class=`),`${route} missing from navigation`);const page=shell(w,{...state,tab:route},'');assert.ok(page.includes('<main>'));assert.ok(!page.includes('NaN'));}assert.ok(html.includes('News & Press Room'));});
