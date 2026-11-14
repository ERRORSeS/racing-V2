import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {renewCalendar,ensureRaceTypeCoverage,openGradedRaceAges} from '../src/race-catalog.js';
import {OFFICIAL_RACE_TYPES,RACE_PROGRESSION} from '../src/race-types.js';
import {COUNTRIES} from '../src/rules.js';
import {upgrade} from '../src/upgrade.js';
import {content} from '../src/ui.js';
import {raceLevelGuideHTML} from '../src/race-guide.js';
import {validate} from '../src/storage.js';
const make=()=>createWorld({country:'USA',seed:'race-type-coverage',historyYears:0,starters:[{}]});

test('All ten official race types occur in every country in each month of a full year',()=>{
 const w=make();
 for(let month=0;month<12;month++){
  w.day=month*30;renewCalendar(w);
  for(const country of Object.keys(COUNTRIES)){
   const fixtures=w.fixtures.filter(f=>f.country===country&&f.day>=w.day&&f.day<w.day+30);
   for(const [type]of OFFICIAL_RACE_TYPES){assert.ok(fixtures.some(f=>f.classId===type),`${country} month ${month+1}: missing ${type}`);assert.ok(fixtures.some(f=>f.classId===type&&f.minAge===2&&f.maxAge===(['g3','g2','g1'].includes(type)?12:4)),`${country} month ${month+1}: missing open progression ${type}`);}
  }
 }
 assert.equal(new Set(w.fixtures.map(f=>f.id)).size,w.fixtures.length);
 validate(w);
});

test('Coverage migration adds missing cards without changing horses, results, booked races or randomness',()=>{
 const w=make();w.day=30;
 // Reproduce a pre-fix calendar with its v4 generation log already committed.
 w.fixtures=w.fixtures.filter(f=>f.templateVersion!==7);
 for(const log of w.calendarGenerationLog)log.outputRaceIds=log.outputRaceIds.filter(id=>!id.startsWith('fixture-coverage-v7'));
 const original=structuredClone(w),existing=new Map(w.fixtures.map(f=>[f.id,structuredClone(f)]));
 upgrade(w);
 assert.ok(w.fixtures.some(f=>f.templateVersion===7&&f.classId==='handicap'&&f.day>=30&&f.day<60));
 for(const [id,f]of existing)assert.deepEqual(w.fixtures.find(x=>x.id===id),f);
 assert.deepEqual(w.horses,original.horses);assert.deepEqual(w.results,original.results);assert.deepEqual(w.ledger,original.ledger);assert.deepEqual(w.sessions,original.sessions);assert.equal(w.rng,original.rng);assert.equal(w.sequence,original.sequence);
 const once=structuredClone(w);ensureRaceTypeCoverage(w);assert.deepEqual(w,once);validate(w);
});

test('Race-type controls expose each category and filter cards before pagination',()=>{
 const w=make(),state={tab:'Races',raceCountry:'USA',raceMonth:'Next',raceType:'handicap',page:0};
 const html=content(w,state);
 for(const [id,label]of OFFICIAL_RACE_TYPES){assert.ok(html.includes(`value="${id}"`));assert.ok(html.includes(label));}
 assert.ok(html.includes('Circuit Handicap'));assert.ok(!html.includes('class="fixture"><summary><strong>Horizon Juvenile Maiden'));
 assert.ok(html.includes('2 matching fixtures'));
 assert.ok(raceLevelGuideHTML().includes(RACE_PROGRESSION));
 const all=content(w,{...state,raceCountry:'All',raceType:'All'});assert.ok(all.includes('page 1 of'));assert.ok(all.includes('data-action="next"'));
});

test('Coverage leaves partial/imported race archives untouched',()=>{
 const w=make();w.fixtures=w.fixtures.slice(0,1);const before=structuredClone(w.fixtures);ensureRaceTypeCoverage(w);assert.deepEqual(w.fixtures,before);
});


test('Scheduled graded age migration permits older runners and preserves classics, archives and entries',async()=>{
 const {eligibility}=await import('../src/racing.js');
 const w=createWorld({country:'USA',seed:'graded-open-age',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'colt'}]}),h=Object.values(w.horses).find(h=>h.owner==='player');
 const fixtures=w.fixtures.filter(f=>f.country==='USA'&&!f.isAnnualMajor&&['g1','g2','g3'].includes(f.classId));
 for(const f of fixtures){f.minAge=2;f.maxAge=4;f.conditions.minAge=2;f.conditions.maxAge=4;}
 const archived={...structuredClone(fixtures[0]),id:'graded-archive',status:'completed',resultId:'old-result'},classic=structuredClone(w.fixtures.find(f=>f.majorSeriesId));w.fixtures.push(archived);
 const entries=structuredClone(fixtures.map(f=>f.entries)),results=structuredClone(w.results),rng=w.rng;
 openGradedRaceAges(w);
 for(const born of [-720,-1800,-2520]){h.born=born;for(const f of fixtures){assert.equal(f.minAge,2);assert.equal(f.maxAge,12);assert.equal(f.conditions.maxAge,12);if(born===-720)assert.doesNotMatch(eligibility(w,h,f)||'',/age restriction/);else assert.equal(eligibility(w,h,f),null);assert.ok(!/Juvenile|2–4|Young Horses/.test(f.title));}}
 assert.deepEqual(fixtures.map(f=>f.entries),entries);assert.deepEqual(w.fixtures.find(f=>f.id===classic.id),classic);assert.equal(archived.maxAge,4);assert.deepEqual(w.results,results);assert.equal(w.rng,rng);
 const once=structuredClone(w.fixtures);openGradedRaceAges(w);assert.deepEqual(w.fixtures,once);
});
