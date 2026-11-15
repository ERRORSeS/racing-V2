import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,train} from '../src/world.js';import {dailyCare,injure} from '../src/care.js';
import {resolveRace} from '../src/racing.js';import {careerWindow,projectedWindow,recordExposure} from '../src/durability.js';
import {useRacingYears} from '../src/racing-years.js';import {assessExposure} from '../src/injury-risk.js';
import {encode,decode,validate} from '../src/storage.js';
let baseline;function make(){baseline??=createWorld({country:'USA',seed:'pre-debut-soundness',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{},{}]});const w=structuredClone(baseline);w.settings.injuryFrequency=0;return w;}
const players=w=>Object.values(w.horses).filter(h=>h.owner==='player');
test('Ninety days of actual training preserve an unraced horse’s soundness reserve and projected racing years',()=>{
 const w=make(),[h,other]=players(w),reserve=h.safeRacingYears,projection=projectedWindow(h,w.day).expected;let sessions=0;
 for(let day=1;day<=90;day++){w.day=day;dailyCare(w,h);if(train(w,h,true))sessions++;}
 assert.ok(sessions>60);assert.equal(h.safeRacingYears,reserve);assert.equal(projectedWindow(h,w.day).expected,projection);assert.equal(h.racingDurability.cumulativeRacingStrain,0);assert.ok(h.racingDurability.preRacingStrain>0);assert.equal(careerWindow(h,w.day).started,false);assert.equal(h.racingDurability.absoluteRaceEndDate,null);assert.equal(h.soundness,100);
 const template=w.fixtures.find(f=>f.country==='USA'&&!f.historical),f={...structuredClone(template),id:'first-actual-debut',day:++w.day,classId:'open',grade:'Open Stakes',tier:4,conditions:{},minAge:2,maxAge:12,maxRunners:2,minStarters:2,targetFieldSize:2,resultId:null,entries:[h,other].map((horse,i)=>({horseId:horse.id,owner:'player',jockeyId:w.jockeys[i].id,tactic:'stalk',carriedWeight:56,gear:structuredClone(horse.gear)}))};w.fixtures.push(f);h.fatigue=0;resolveRace(w,f.id);assert.equal(h.racingDurability.firstRaceDate,w.day);assert.equal(h.racingDurability.absoluteRaceEndDate,w.day+1800);assert.ok(h.racingDurability.cumulativeRacingStrain>0);assert.ok(h.safeRacingYears<reserve);validate(w);
});
test('Training injuries before debut affect physical health and clearance without consuming racing years',()=>{
 const w=make(),h=players(w)[0],reserve=h.safeRacingYears;w.settings.fatalities=false;injure(w,h,'Medium','Training muscle strain','training','muscle_strain');assert.equal(h.safeRacingYears,reserve);assert.ok(h.soundness<100);assert.ok(h.medicalCase);assert.equal(h.clearance,'No Work');assert.equal(h.racingDurability.cumulativeRacingStrain,0);assert.ok(h.racingDurability.preRacingStrain>0);assert.equal(careerWindow(h,w.day).started,false);w.settings.injuryFrequency=1;assert.ok(assessExposure(w,h,'training').probability>0);
});
test('Old never-raced saves regain lost years without resetting injuries, strain evidence, genes or existing race results',()=>{
 const w=make(),h=players(w)[0],raced=Object.values(w.horses).find(h=>h.starts.length),oldRacedYears=raced.safeRacingYears,results=JSON.stringify(w.results),genome=JSON.stringify(h.genome),identity=h.id;h.safeRacingYears=.4;h.racingDurability.cumulativeRacingStrain=30;h.racingDurability.chronicSusceptibility=7;h.soundness=88;delete w.preDebutSoundnessVersion;
 const restored=decode(encode(w)),next=restored.horses[identity];assert.equal(next.safeRacingYears,next.racingDurability.individualRacingLongevity);assert.equal(next.racingDurability.cumulativeRacingStrain,0);assert.equal(next.racingDurability.preRacingStrain,30);assert.equal(next.racingDurability.chronicSusceptibility,7);assert.equal(next.soundness,88);assert.equal(JSON.stringify(next.genome),genome);assert.equal(restored.horses[raced.id].safeRacingYears,oldRacedYears);assert.equal(JSON.stringify(restored.results),results);assert.ok(next.durabilityEvents.some(e=>e.type==='Pre-debut soundness corrected'));assert.deepEqual(decode(encode(restored)),restored);
});
test('Calendar age and pre-racing workload do not spend a late debutant’s racing reserve',()=>{
 const w=make(),h=players(w)[0];h.born=-2520;const reserve=h.safeRacingYears;w.day=40;recordExposure(w,h,'training',{load:18});assert.equal(useRacingYears(w,h,.3),false);assert.equal(h.safeRacingYears,reserve);assert.equal(careerWindow(h,w.day).end,null);
});
