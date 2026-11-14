import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {renewCalendar,ensureRaceTypeCoverage} from '../src/race-catalog.js';
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
   for(const [type]of OFFICIAL_RACE_TYPES)assert.ok(fixtures.some(f=>f.classId===type),`${country} month ${month+1}: missing ${type}`);
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
