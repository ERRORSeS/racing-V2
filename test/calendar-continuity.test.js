import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,advanceWorld} from '../src/world.js';
import {renewCalendar,ensureCalendarHorizon,MEETING_RULES} from '../src/race-catalog.js';
import {COUNTRIES} from '../src/rules.js';
import {encode,decode,validate} from '../src/storage.js';
import {content} from '../src/ui.js';
let baseline;
function make(){baseline??=createWorld({country:'USA',seed:'calendar-continuity',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'colt'}]});return structuredClone(baseline);}
function assertHorizon(w){for(const start of [Math.floor(w.day/30)*30,Math.floor(w.day/30)*30+30])for(const country of Object.keys(COUNTRIES))for(const [meeting,offset]of MEETING_RULES.days.entries()){if(start+offset<=w.day)continue;for(let slot=0;slot<6;slot++)assert.ok(w.fixtures.some(f=>f.id===`fixture-v4-${country}-${start}-${meeting}-${slot}`),`${country} ${start} ${meeting} ${slot}`);}assert.equal(new Set(w.fixtures.map(f=>f.id)).size,w.fixtures.length);assert.equal(new Set(w.calendarGenerationLog.map(l=>l.key)).size,w.calendarGenerationLog.length);}
test('Loading a stalled career after the original two-month horizon restores current and next month',()=>{const w=make();w.day=75;const old=new Map(w.fixtures.map(f=>[f.id,structuredClone(f)])),horses=structuredClone(w.horses),results=structuredClone(w.results),rng=w.rng,balance=w.balance;const restored=decode(encode(w));assert.equal(ensureCalendarHorizon(restored),true);assertHorizon(restored);for(const [id,f]of old)assert.deepEqual(restored.fixtures.find(f=>f.id===id),f);assert.deepEqual(restored.horses,horses);assert.deepEqual(restored.results,results);assert.equal(restored.rng,rng);assert.equal(restored.balance,balance);validate(restored);});
test('A stale publication log cannot suppress missing future cards; existing bookings are retained',()=>{const w=make();w.day=35;const booked=w.fixtures.find(f=>f.id==='fixture-v4-USA-30-1-0');booked.entries.push({horseId:Object.values(w.horses).find(h=>h.owner==='player').id,owner:'player',jockeyId:w.jockeys[0].id});const before=structuredClone(booked);w.fixtures=w.fixtures.filter(f=>f.id===booked.id||!f.id.startsWith('fixture-v4-USA-30'));assert.equal(ensureCalendarHorizon(w),true);assertHorizon(w);assert.deepEqual(w.fixtures.find(f=>f.id===booked.id),before);const once=structuredClone(w);assert.equal(ensureCalendarHorizon(w),false);renewCalendar(w);assert.deepEqual(w,once);});
test('Rolling calendar recovery continues beyond two months and across year boundaries',()=>{const w=make();for(const day of [65,95,185,355,365,725]){w.day=day;ensureCalendarHorizon(w);assertHorizon(w);for(const month of ['Current','Next']){const html=content(w,{tab:'Races',raceCountry:'USA',raceMonth:month,raceAge:'All',raceType:'All',page:0});if(month==='Next'||MEETING_RULES.days.some(offset=>Math.floor(w.day/30)*30+offset>w.day))assert.ok(html.includes('class="fixture"'),`${day} ${month}`);}assert.ok(content(w,{tab:'Calendar'}).includes('scheduled'));}});
test('Age filters include open-age graded cards instead of hiding every G1',()=>{const w=make();for(const raceAge of ['young','adult']){const html=content(w,{tab:'Races',raceCountry:'USA',raceMonth:'Current',raceAge,raceType:'g1',page:0});assert.ok(html.includes('class="fixture"'));assert.ok(!html.includes('No upcoming fixtures match'));}});


test('Actual month-end advancement extends a recovered calendar beyond the original two months',()=>{
 const w=make();w.day=59;w.settings.injuryFrequency=0;
 for(const f of w.fixtures)if(f.status==='scheduled'&&f.day<w.day)f.status='canceled';
 const results=structuredClone(w.results);advanceWorld(w,1);
 assert.equal(w.day,60);assertHorizon(w);assert.deepEqual(w.results,results);validate(w);
});
