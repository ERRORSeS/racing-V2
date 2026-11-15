import {packRaceArchives} from '../src/immutable-race-archive.js';
import {packArchivedFields} from '../src/archive-fields.js';
import {advanceSteps} from '../src/world.js';
import {scheduleIndex,invalidateSchedule} from '../src/reservations.js';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createWorld,advanceWorld} from '../src/world.js';import {snapshotParts} from '../src/snapshot-parts.js';
import {beginPopulation,liveHorses,registerPopulationHorse} from '../src/simulation-population.js';
test('Live simulation population keeps insertion order, accepts births and excludes archived ancestors',()=>{const h={id:'h',owner:'player'},a={id:'a',owner:'archive'},w={horses:{h,a}};beginPopulation(w);const foal={id:'foal',owner:'player'};w.horses.foal=foal;registerPopulationHorse(w,foal);assert.deepEqual(liveHorses(w),[h,foal]);w.horses.direct={id:'direct',owner:'player'};beginPopulation(w);assert.deepEqual(liveHorses(w).map(h=>h.id),['h','foal','direct']);});
// Golden oracle recorded from main f49d8a5 before optimization. Includes every
// horse, gene, clinical event, session, result, prize, campaign and RNG state.
test('Optimized month exactly matches the complete pre-optimization simulation',()=>{const w=createWorld({country:'USA',seed:'skip-profile',historyYears:0,creativeMode:true,starters:[{}]});advanceWorld(w,30);const hash=createHash('sha256');for(const part of snapshotParts(w))hash.update(JSON.stringify(part));assert.equal(hash.digest('hex'),'081b6d389b32e8067d52770a79ea7e3ef850417fdeb7e9f39ce766e1728b5448');});

test('Fixture changes reuse the population index; a new day still refreshes it',()=>{let scans=0;const horses=new Proxy({h:{id:'h',owner:'npc',status:'active',location:'UK'}},{ownKeys(target){scans++;return Reflect.ownKeys(target);}}),w={day:0,horses,travel:[],fixtures:[{id:'next',day:5,status:'scheduled',entries:[]}]};scheduleIndex(w);const first=scans;w.fixtures.push({id:'historical',day:-10,status:'completed',entries:[]});scheduleIndex(w);invalidateSchedule(w,{population:false});scheduleIndex(w);assert.equal(scans,first);w.day=1;scheduleIndex(w);assert.equal(scans,first+1);});

test('Packed ancestor genomes and yielded days preserve the complete simulation oracle',()=>{const w=createWorld({country:'USA',seed:'skip-profile',historyYears:0,creativeMode:true,starters:[{}]});packArchivedFields(w);for(const day of advanceSteps(w,30))packRaceArchives(packArchivedFields(w));const hash=createHash('sha256');for(const part of snapshotParts(w))hash.update(JSON.stringify(part));assert.equal(hash.digest('hex'),'081b6d389b32e8067d52770a79ea7e3ef850417fdeb7e9f39ce766e1728b5448');});
