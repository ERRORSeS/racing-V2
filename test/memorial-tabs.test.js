import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {horse,ownedHorse} from '../src/core.js';
import {naturalDeathDay,monthlyLifespans} from '../src/lifespan.js';
import {createHorseGroup,addHorseToGroup} from '../src/horse-groups.js';
import {content} from '../src/ui.js';
import {validate,encode,decode} from '../src/storage.js';
let base;function make(){base??=createWorld({country:'USA',seed:'memorial-tabs',historyYears:0,creativeMode:true,starters:[{}]});return structuredClone(base);}
test('individual natural lifespans are stable and between 25 and 35 years, preserve identity and Memorial is read-only',()=>{
 const w=make(),h=horse(w,'player','USA',{},2,-12600),rng=w.rng,death=naturalDeathDay(w,h);assert.ok(death-h.born>=9000&&death-h.born<=12600);assert.equal(w.rng,rng);assert.equal(naturalDeathDay(w,structuredClone(h)),death);const identity=[h.id,h.sire,h.dam];monthlyLifespans(w);assert.equal(h.status,'deceased');assert.deepEqual([h.id,h.sire,h.dam],identity);assert.throws(()=>ownedHorse(w,h.id),/read-only/);const html=content(w,{tab:'Horses',selected:h.id});assert.match(html,/Memorial/);assert.doesNotMatch(html,/data-form="workout"|data-action="retire"|data-form="cover"/);validate(w);const saved=decode(encode(w));assert.equal(saved.horses[h.id].status,'deceased');assert.equal(naturalDeathDay(saved,saved.horses[h.id]),death);
});
test('named tabs persist memberships, reject duplicate names and Memorial retains deceased horses',()=>{
 const w=make(),h=Object.values(w.horses).find(h=>h.owner==='player'),g=createHorseGroup(w,'Future champions');addHorseToGroup(w,h.id,g.id);addHorseToGroup(w,h.id,g.id);assert.deepEqual(h.horseGroupIds,[g.id]);assert.throws(()=>createHorseGroup(w,'future champions'),/unique/);const saved=decode(encode(w));assert.equal(saved.horseGroups[0].name,'Future champions');assert.deepEqual(saved.horses[h.id].horseGroupIds,[g.id]);const html=content(w,{tab:'Horses',horseGroupId:g.id,query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name',raceRecordFilter:'All'});assert.ok(html.includes(`data-horse="${h.id}"`));
});
test('stud service ends at 25 while living retired horses remain until their individual natural lifespan',()=>{
 const w=make(),h=horse(w,'player','USA',{sex:'colt'},2,-9000);h.status='retired';h.brood=true;
 if(naturalDeathDay(w,h)===0)h.born--;
 monthlyLifespans(w);assert.equal(h.status,'retired');assert.equal(h.brood,false);assert.equal(h.studServiceEndedDay,0);assert.ok(w.horses[h.id]);
});
