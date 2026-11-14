import { npcConsignmentAllowed } from '../src/catalog-policy.js';
import { patchBase, worldPatch, applyWorldPatch } from '../src/world-patch.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,advanceWorld} from '../src/world.js';
import {horse} from '../src/core.js';
import {resolveRace,eligibility} from '../src/racing.js';
import {validate,encode,decode} from '../src/storage.js';
import {timelineIssue,repairCareerTimelines,validateCareerTimeline} from '../src/career-timeline.js';
import {career,careerMatches} from '../src/career.js';
import {putOnBreak} from '../src/recovery.js';
import {injure,dailyCare,scheduledTraining} from '../src/care.js';
import {changeFatigue,fatigueSummary} from '../src/fatigue.js';
import {createAdvanceQueue} from '../src/advance-queue.js';
const make=(historyYears=0)=>createWorld({country:'USA',seed:'v6-release',historyYears,creativeMode:true,starterEducation:'race_ready',starters:[{}]});
const player=w=>Object.values(w.horses).find(h=>h.owner==='player');

test('V6 153–154/158: 1,000 unstarted juveniles and youngstock have no personal achievements',()=>{
 const w=make();for(let i=0;i<1500;i++){const h=horse(w,'player','USA',{},0,i<1000?-720:-360);assert.equal(career(h).starts,0);assert.equal(career(h).earnings,'0');assert.equal(career(h).stakesWins,0);assert.equal(h.youngstock.starting.status,'not_started');}
 validate(w);
});
test('V6 155–157/159: a real juvenile G2 winner is allowed and every claim matches its race evidence',()=>{
 const w=make();w.settings.injuryFrequency=0;const f=structuredClone(w.fixtures.find(f=>f.classId==='maiden'&&f.country==='USA'));Object.assign(f,{id:'juvenile-g2',day:30,title:'Juvenile G2 Trial',classId:'g2',grade:'Grade 2',tier:6,blackType:true,minAge:2,maxAge:2,conditions:{},entries:[],resultId:null});w.fixtures=[f];w.day=30;const r=resolveRace(w,f.id);assert.ok(r);const h=w.horses[r.rows[0].horseId];assert.equal(h.starts.at(-1).classId,'g2');assert.equal(h.starts.at(-1).place,1);validateCareerTimeline(w,h);assert.ok(BigInt(career(h).earnings)>0n);assert.equal(careerMatches(h,'g2'),true);assert.equal(careerMatches(h,'Juvenile Stakes Winner'),true);assert.equal(careerMatches(h,'Unraced'),false);w.settings.eliteJuvenileCatalogChance=0;assert.equal(npcConsignmentAllowed(w,h),false);w.settings.eliteJuvenileCatalogChance=1;assert.equal(npcConsignmentAllowed(w,h),true);f.minAge=3;assert.match(timelineIssue(w,h,h.starts.at(-1)),/age/);f.minAge=2;const evidence=h.starts.at(-1).readiness;evidence.completedDay=w.day+1;assert.match(timelineIssue(w,h,h.starts.at(-1)),/readiness/);evidence.completedDay=0;h.starts.at(-1).prize='999999999';assert.match(timelineIssue(w,h,h.starts.at(-1)),/summary disagrees/);
});
test('V6 156/163: legacy impossible juvenile claims are quarantined; genuine events, identity and money survive',()=>{
 const w=make(3),h=Object.values(w.horses).find(h=>h.starts.length),start=h.starts[0],r=w.results[start.resultId],original=structuredClone(r),identity=h.id,balance=w.balance;
 h.born=start.day-300;delete w.careerTimelineVersion;repairCareerTimelines(w);
 assert.equal(h.id,identity);assert.equal(w.balance,balance);assert.deepEqual(w.results[r.id],original);assert.ok(h.careerQuarantine.some(q=>q.reason.includes('age')));assert.ok(!h.starts.some(s=>s.resultId===r.id));const count=w.careerAudit.length;repairCareerTimelines(w);assert.equal(w.careerAudit.length,count);
});
test('V6 157/160: mismatched career summaries normalize to existing results without rerolling history',()=>{
 const w=make(3),h=Object.values(w.horses).find(h=>h.starts.length),start=h.starts[0],original=structuredClone(w.results[start.resultId]);start.prize='999999999';start.classId='g2';delete w.careerTimelineVersion;repairCareerTimelines(w);assert.equal(h.starts[0].prize,original.rows.find(r=>r.horseId===h.id).prize);assert.ok(h.careerCorrections.length);validateCareerTimeline(w,h);const loaded=decode(encode(w));assert.deepEqual(loaded.horses[h.id].starts,h.starts);
});
test('V6 169: two rapid skip requests execute in FIFO order, errors stop later skips',async()=>{
 let day=0,release;const gate=new Promise(resolve=>release=resolve),seen=[];
 const q=createAdvanceQueue(async days=>{seen.push(days);if(seen.length===1)await gate;day+=days;});const a=q.enqueue(30),b=q.enqueue(30);assert.equal(q.length,2);release();await Promise.all([a,b]);assert.equal(day,60);assert.deepEqual(seen,[30,30]);
 const failed=createAdvanceQueue(async()=>{throw Error('Disk full');});const results=await Promise.allSettled([failed.enqueue(1),failed.enqueue(30)]);assert.ok(results.every(r=>r.status==='rejected'));
});
test('V6 177–178/183: a quiet month and light exercise recover acute fatigue to zero',()=>{
 for(const intensity of ['Rest','Light']){const w=make(),h=player(w);h.fatigue=70;h.autoTrain=true;h.trainingIntensity=intensity;w.settings.injuryFrequency=0;
 for(let i=0;i<30;i++){w.day++;dailyCare(w,h);scheduledTraining(w,h);}assert.ok(h.fatigue<=5,`${intensity}: ${h.fatigue}`);assert.ok(fatigueSummary(w,h).recovery>=0);}
 const w=make(),h=player(w);h.fatigue=.3;changeFatigue(w,h);assert.equal(h.fatigue,0);
});
test('V6 179/181/184: workload is logged and a 30-day rest blocks entries while an injury remains distinct',()=>{
 const w=make(),h=player(w);w.settings.injuryFrequency=0;h.fatigue=70;h.autoTrain=true;h.autoRace=true;putOnBreak(w,h.id,30);injure(w,h,'Severe','Tendon tear');
 for(let i=0;i<30;i++){w.day++;dailyCare(w,h);scheduledTraining(w,h);}assert.equal(h.fatigue,0);assert.ok(h.medicalCase);assert.notEqual(h.clearance,'Race-Cleared');assert.equal(h.breakPlan.stage,'Review Due');assert.equal(w.events.filter(e=>e.horseId===h.id&&e.text.includes('break review due')).length,1);assert.ok(eligibility(w,h,w.fixtures.find(f=>f.status==='scheduled')));assert.ok(h.workloadLoad28d<10);
});
test('V6 168/180/182: day and month advancement preserve identical scheduled outcomes and survive export',()=>{
 const a=make(),b=structuredClone(a);a.settings.injuryFrequency=b.settings.injuryFrequency=0;player(a).fatigue=player(b).fatigue=70;player(a).autoTrain=player(b).autoTrain=true;advanceWorld(a,30);for(let i=0;i<30;i++)advanceWorld(b,1);
 assert.equal(a.rng,b.rng);assert.equal(player(a).fatigue,player(b).fatigue);assert.deepEqual(a.results,b.results);assert.deepEqual(a.coverings,b.coverings);assert.deepEqual(a.ledger,b.ledger);assert.deepEqual(a.news,b.news);assert.deepEqual(a.awards,b.awards);assert.deepEqual(player(a).fatigueLog,player(b).fatigueLog);assert.equal(decode(encode(a)).horses[player(a).id].fatigue,player(a).fatigue);
});

test('Worker patches reconstruct the exact committed world while omitting unchanged race archives',()=>{
 const w=make(3),original=structuredClone(w),base=patchBase(w);w.settings.injuryFrequency=0;advanceWorld(w,2);const patch=worldPatch(w,base),merged=applyWorldPatch(original,patch);assert.deepEqual(merged,w);assert.ok(Object.keys(patch.results).length<Object.keys(w.results).length);assert.ok(Object.keys(patch.horses).length<Object.keys(w.horses).length);validate(merged);
});

test('Historical maidens and novice races obey earned win restrictions',()=>{
 const w=make(10);for(const h of Object.values(w.horses))validateCareerTimeline(w,h);
 const h=Object.values(w.horses).find(h=>h.starts.some(s=>s.place===1)&&h.starts.length>2),start=h.starts.at(-1),f=w.fixtures.find(f=>f.id===start.fixtureId),old=f.conditions;
 f.conditions={...old,maxWins:0};assert.match(timelineIssue(w,h,start),/win restriction/);f.conditions=old;
});
