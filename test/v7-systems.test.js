import {buy} from '../src/market.js';
import {recordSaleEvidence} from '../src/valuation.js';
import {upgrade} from '../src/upgrade.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,advanceWorld,changeCountry} from '../src/world.js';
import {initializeDurability,recordFirstStart,recordExposure,durabilityDay,projectedWindow,careerWindow,completeRacingCareer,racingWindowReason} from '../src/durability.js';
import {assessExposure} from '../src/injury-risk.js';
import {initializeAppraisal,appraisal,marketComponents,recordVerifiedStart} from '../src/valuation.js';
import {initializeV7World,settleV7Race} from '../src/v7.js';
import {eligibility,enterRace,scratchRace} from '../src/racing.js';
import {dailyCare,injure,scheduledTraining} from '../src/care.js';
import {putOnBreak,startTherapy} from '../src/recovery.js';
import {validate,encode,decode} from '../src/storage.js';
import {content} from '../src/ui.js';
import {RACE_CLASSES,classLabel} from '../src/race-rules.js';
let baseline;const make=()=>{baseline??=createWorld({country:'USA',seed:'v7-acceptance',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'colt'}]});return structuredClone(baseline);};const own=w=>Object.values(w.horses).find(h=>h.owner==='player');
// Canonical completed event fixtures let appraisal tests compare known placings;
// production competition still uses the untouched segment/placing calculations.
function committed(w,h,{day=w.day+21,classId='g3',position=2,size=10,rating=90}={}){
 w.day=day;const c=RACE_CLASSES.find(c=>c.id===classId),others=Object.values(w.horses).filter(x=>x.id!==h.id&&x.owner!=='archive'&&x.country==='USA').slice(0,size-1),horses=[...others];horses.splice(Math.min(position-1,horses.length),0,h);const id=`v7-fixture-${w.sequence++}`,resultId=`v7-result-${w.sequence++}`,jockeys=w.jockeys.filter(j=>j.country==='USA');
 const rows=horses.map((x,i)=>({horseId:x.id,name:x.name,owner:x.owner,jockeyId:jockeys[i].id,jockeyName:jockeys[i].name,place:i+1,outcome:'Finished',time:100+i,margin:i*.5,prize:(BigInt(c.purse)*BigInt([60,22,12,4,2][i]||0)/100n).toString(),effectiveSkills:{speed:80,stamina:80},carriedWeight:56,gear:structuredClone(x.gear),splits:[]}));
 const f={id,day,country:'USA',track:'Liberty Downs',surface:'dirt',distance:1600,title:`Verified ${classId}`,grade:classLabel(c,'USA'),classId,tier:c.tier,blackType:!!c.blackType,purse:c.purse,fee:'0',minAge:2,maxAge:12,conditions:{},status:'completed',entries:rows.map(row=>({horseId:row.horseId,owner:row.owner,jockeyId:row.jockeyId})),resultId};const r={id:resultId,fixtureId:id,day,title:f.title,country:'USA',track:f.track,surface:'dirt',distance:1600,going:'good',grade:f.grade,classId,tier:c.tier,rows,frames:[],highlights:[],events:[]};w.fixtures.push(f);w.results[resultId]=r;
 for(const row of rows){const x=w.horses[row.horseId];x.starts.push({resultId,fixtureId:id,day,title:r.title,track:r.track,country:r.country,surface:r.surface,distance:r.distance,grade:r.grade,classId,tier:c.tier,blackType:!!c.blackType,performanceRating:rating+(x.id===h.id?0:2),...row});recordFirstStart(w,x);}
 settleV7Race(w,r);return {f,r,start:h.starts.at(-1)};
}
function oldExport(w){w.schema=6;const payload=JSON.stringify(w);let hash=2166136261;for(const c of payload)hash=Math.imul(hash^c.charCodeAt(0),16777619);return JSON.stringify({format:'thoroughbred-racing',checksum:(hash>>>0).toString(16),payload});}

test('V7 185–189: individual 1–5-year projections, actual first-start clocks, no clock from training or country changes',()=>{
 const w=make(),h=own(w),scores=new Set(Object.values(w.horses).map(h=>h.racingDurability.latentDurabilityScore));assert.ok(scores.size>20);for(const x of Object.values(w.horses))assert.ok(x.racingDurability.individualRacingLongevity>=1&&x.racingDurability.individualRacingLongevity<=5);
 h.autoTrain=true;w.settings.injuryFrequency=0;for(let d=1;d<=30;d++){w.day=d;dailyCare(w,h);scheduledTraining(w,h);}assert.equal(h.racingDurability.firstRaceDate,null);
 committed(w,h,{day:360,classId:'allowance'});assert.equal(h.racingDurability.firstRaceDate,360);assert.equal(h.racingDurability.firstRacingAge,3);assert.equal(h.racingDurability.absoluteRaceEndDate,2160);const first=h.racingDurability.firstRaceDate;changeCountry(w,'UK');assert.equal(h.racingDurability.firstRaceDate,first);assert.equal(decode(encode(w)).horses[h.id].racingDurability.firstRaceDate,first);
});
test('V7 190–191/197: exposure risk is bounded, higher after demanding campaigns, shared by NPCs, never age-triggered injury',()=>{
 const w=make(),h=own(w),robust=structuredClone(h),frail=structuredClone(h);robust.racingDurability.latentDurabilityScore=95;frail.racingDurability.latentDurabilityScore=10;frail.racingDurability.cumulativeRacingStrain=300;frail.racingDurability.chronicSusceptibility=45;const rng=w.rng,a=assessExposure(w,robust,'training',{load:15}),b=assessExposure(w,frail,'training',{load:15});assert.ok(b.probability>a.probability);assert.ok(b.probability<=.035);assert.equal(w.rng,rng);frail.owner=Object.keys(w.owners).find(id=>!['archive','player'].includes(id));assert.equal(assessExposure(w,frail,'training',{load:15}).probability,b.probability);
 h.born=-2520;h.fatigue=0;w.day=1;durabilityDay(w,h);assert.equal(h.status,'active');assert.equal(h.medicalCase,null);
});
test('V7 192–193: rest clears fatigue/reversible stress but not strain, therapy cannot exceed the debut window',()=>{
 const w=make(),h=own(w);committed(w,h,{day:0});h.fatigue=70;h.racingDurability.cumulativeRacingStrain=120;h.racingDurability.repetitiveStressIndex=50;putOnBreak(w,h.id,30);for(let d=1;d<=30;d++){w.day=d;dailyCare(w,h);}assert.equal(h.fatigue,0);assert.equal(h.racingDurability.cumulativeRacingStrain,120);assert.ok(h.racingDurability.repetitiveStressIndex<5);const end=h.racingDurability.absoluteRaceEndDate;w.day=1700;startTherapy(w,h.id,6);for(let d=1701;d<=1880;d++){w.day=d;dailyCare(w,h);}assert.equal(h.racingDurability.absoluteRaceEndDate,end);assert.equal(h.racingDurability.racingRetirementReason,'Racing Career Completed');assert.equal(h.status,'retired');assert.ok(h.safeRacingYears<=0);assert.equal(h.racingDurability.cumulativeRacingStrain,120);
});
test('V7 194–196: exclusive five-year expiry scratches once, preserves health and records, severe injury still blocks early entry',()=>{
 const w=make(),h=own(w);committed(w,h,{day:0});h.soundness=96;const f=w.fixtures.find(f=>f.status==='scheduled'&&f.country==='USA');f.day=1801;f.entries.push({horseId:h.id,owner:'player',jockeyId:w.jockeys[0].id,fee:'100000'});const balance=BigInt(w.balance),results=structuredClone(w.results);w.day=1800;completeRacingCareer(w,h);assert.equal(h.status,'retired');assert.equal(h.soundness,96);assert.equal(h.medicalCase,null);assert.equal(f.entries.some(e=>e.horseId===h.id),false);assert.equal(BigInt(w.balance),balance+100000n);completeRacingCareer(w,h);assert.equal(BigInt(w.balance),balance+100000n);assert.deepEqual(w.results,results);assert.match(racingWindowReason(w,h,1800),/completed/);
 const v=make(),young=own(v);injure(v,young,'Severe','Tendon injury');young.fatigue=0;assert.match(eligibility(v,young,v.fixtures.find(f=>f.country==='USA'&&f.status==='scheduled')),/Veterinary/);
});
test('V7 198–205: strong consistent placers gain bounded value; tiny weak fields cannot farm unlimited prices or change genes',()=>{
 const good=make(),bad=make(),a=own(good),b=own(bad),caps=structuredClone(a.potential);for(let i=0;i<10;i++){committed(good,a,{position:i<4?1:i<8?2:3,classId:'g3'});committed(bad,b,{position:i<2?1:9,classId:'maiden'});}
 assert.ok(marketComponents(good,a).rawTarget>marketComponents(bad,b).rawTarget);assert.ok(BigInt(appraisal(good,a))>BigInt(appraisal(bad,b)));assert.deepEqual(a.potential,caps);assert.ok(a.marketAppraisal.consistency.confidence<1);
 const tiny=make(),h=own(tiny),initial=Number(appraisal(tiny,h));for(let i=0;i<20;i++)committed(tiny,h,{position:3,size:3,classId:'allowance'});assert.ok(Number(appraisal(tiny,h))<initial*2);const before=Number(appraisal(good,a));committed(good,a,{position:10,classId:'g3',rating:55});assert.ok(Number(appraisal(good,a))>=before*.92);
});
test('V7 206–207: legacy migration anchors $1.5M appraisal and preserves all results and realized prices',()=>{
 const w=make(),h=own(w);committed(w,h,{day:21});h.appraisedValue='150000000';delete h.marketAppraisal;delete h.racingDurability;delete w.v7Migration;w.listings[0].salePrice='75000000';const oldResults=structuredClone(w.results),prices=w.listings.map(l=>[l.id,l.salePrice,l.price]);const loaded=decode(oldExport(w));assert.equal(appraisal(loaded,loaded.horses[h.id]),'150000000');assert.deepEqual(loaded.results,oldResults);assert.deepEqual(loaded.listings.map(l=>[l.id,l.salePrice,l.price]),prices);assert.equal(loaded.horses[h.id].racingDurability.firstRaceDate,21);
});
test('V7 208–210: cached value, settlement and renders are idempotent; entries/scratches create no starts or value events',()=>{
 const w=make(),h=own(w),{r,start}=committed(w,h,{day:21,position:2}),value=appraisal(w,h),count=h.valuationHistory.length,ledger=structuredClone(w.ledger);settleV7Race(w,r);recordVerifiedStart(w,h,start);assert.equal(h.valuationHistory.length,count);assert.equal(appraisal(w,h),value);const before=encode(w);for(const profileTab of ['Overview','Medical','Durability & Market'])content(w,{tab:'Horses',selected:h.id,profileTab,profileStack:[],page:0,query:'',countryFilter:'All',sexFilter:'All',sort:'name'});assert.equal(encode(w),before);assert.deepEqual(w.ledger,ledger);
 const fresh=make(),x=own(fresh),f=fresh.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden'),j=fresh.jockeys.find(j=>j.country==='USA'&&!fresh.fixtures.some(q=>q.day===f.day&&q.entries.some(e=>e.jockeyId===j.id)));enterRace(fresh,f.id,x.id,j.id);scratchRace(fresh,f.id,x.id);assert.equal(x.starts.length,0);assert.equal(x.racingDurability.firstRaceDate,null);assert.equal(x.valuationHistory.length,0);
});
test('V7 211: chunked and daily advancement preserve RNG, results, appraisals and strain with exact reload',()=>{
 const a=make(),b=structuredClone(a);a.settings.injuryFrequency=b.settings.injuryFrequency=0;advanceWorld(a,30);for(let i=0;i<30;i++)advanceWorld(b,1);assert.equal(a.rng,b.rng);assert.deepEqual(a.results,b.results);assert.deepEqual(a.news,b.news);assert.deepEqual(own(a).racingDurability,own(b).racingDurability);assert.deepEqual(own(a).marketAppraisal,own(b).marketAppraisal);assert.deepEqual(decode(encode(a)),a);validate(a);
});

test('Ages 2–4 have rating-free Allowance and Claiming at every regular meeting',()=>{
 const w=make(),h=own(w),cards=w.fixtures.filter(f=>f.country==='USA'&&f.day<30&&f.id.startsWith('fixture-v7-young-'));
 for(const day of [3,10,17,24])for(const type of ['allowance','claiming']){const f=cards.find(f=>f.day===day&&f.classId===type);assert.ok(f,`${day}: ${type}`);assert.equal(f.minAge,2);assert.equal(f.maxAge,4);assert.equal(f.conditions.minRating,null);assert.equal(f.conditions.minWins,null);}
 for(const type of ['maiden','novice','handicap','open','listed','g3','g2','g1'])assert.ok(w.fixtures.some(f=>f.country==='USA'&&f.day<30&&f.classId===type&&f.minAge===2&&f.maxAge===4),type);
 const f=cards[0];assert.equal(eligibility(w,h,f),null);h.born=-1440;assert.equal(eligibility(w,h,f),null);h.born=-1800;assert.match(eligibility(w,h,f),/age restriction/);
});
test('Non-maiden minimum-win progression accepts actual top-three finishes while maidens retain win rules',()=>{
 const w=make(),h=own(w);committed(w,h,{day:0,position:2,classId:'allowance'});committed(w,h,{day:21,position:3,classId:'allowance'});
 const f={...w.fixtures.find(f=>f.country==='USA'&&f.classId==='g3'),id:'top3-progression',day:42,entries:[],conditions:{minWins:2},minAge:2,maxAge:12,status:'scheduled'};w.fixtures.push(f);upgrade(w);assert.equal(f.conditions.minPlacings,2);assert.equal(f.conditions.minWins,undefined);assert.equal(h.starts.filter(s=>s.place===1).length,0);assert.equal(eligibility(w,h,f),null);f.conditions.minPlacings=3;assert.match(eligibility(w,h,f),/top-three/);
 const maiden=w.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden');maiden.day=42;assert.equal(eligibility(w,h,maiden),null);committed(w,h,{day:35,classId:'allowance',position:1});assert.match(eligibility(w,h,maiden),/Win restriction|without a win/);
});
test('Class and field evidence rewards a G1 placing above a low-level win and discounts a four-start sample',()=>{
 const a=make(),b=make(),x=own(a),y=own(b);for(let i=0;i<4;i++){committed(a,x,{position:3,classId:'g1'});committed(b,y,{position:1,classId:'maiden'});}const e=marketComponents(a,x),f=marketComponents(b,y);assert.ok(e.quality>f.quality);const confidence=e.consistency.confidence;for(let i=0;i<6;i++)committed(a,x,{position:3,classId:'g1'});assert.ok(marketComponents(a,x).consistency.confidence>confidence);
});

test('Weak three-runner pattern races cannot manufacture a breeding premium',()=>{const w=make(),h=own(w);for(let i=0;i<20;i++)committed(w,h,{position:1,size:3,classId:'g1'});const c=marketComponents(w,h);assert.equal(c.breedingPremium,0);assert.ok(c.rawTarget<500000);});

test('A realized sale adds bounded non-cash evidence once without changing the debut clock or paid amount',()=>{
 const w=make(),l=w.listings.find(l=>l.kind==='private'),h=w.horses[l.horseId],first=h.racingDurability.firstRaceDate,old=Number(appraisal(w,h)),balance=BigInt(w.balance);l.price='75000000';buy(w,l.id);assert.equal(l.salePrice,'75000000');assert.equal(BigInt(w.balance),balance-75000000n);assert.equal(h.racingDurability.firstRaceDate,first);assert.ok(Number(appraisal(w,h))<old*1.05);const count=h.valuationHistory.length;recordSaleEvidence(w,h,l);assert.equal(h.valuationHistory.length,count);assert.equal(h.marketAppraisal.salesEvidence.length,1);
});

test('A permanent clinical restriction has zero projected racing return while retaining its breeding identity',()=>{const w=make(),h=own(w);w.settings.fatalities=false;injure(w,h,'Very Severe','Permanent tendon rupture');assert.equal(h.status,'active');assert.equal(projectedWindow(h,w.day).high,0);assert.equal(marketComponents(w,h).future,0);assert.ok(h.medicalCase);assert.equal(h.sex,'colt');});
