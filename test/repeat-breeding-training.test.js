import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {cover,foal,coveringReason} from '../src/breeding.js';
import {pregnancySummary} from '../src/reproduction.js';
import {retire,train,scheduledTraining} from '../src/care.js';
import {educationSession} from '../src/youngstock.js';
import {pregnancyCard} from '../src/pregnancy-ui.js';
import {youngstockProfile} from '../src/youngstock-ui.js';
import {upgrade} from '../src/upgrade.js';
import {encode,decode,validate} from '../src/storage.js';
let baseline;
function make(){
 baseline??=createWorld({country:'USA',seed:'repeat-breeding',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{sex:'filly'},{sex:'colt'}]});
 const w=structuredClone(baseline);w.settings.avoidCloseBreeding=false;w.settings.injuryFrequency=0;
 const [dam,sire]=Object.values(w.horses).filter(h=>h.owner==='player');
 for(const h of [dam,sire]){h.born=-1080;retire(w,h.id);h.soundness=100;h.medicalCase=null;}
 return {w,dam,sire};
}
function birth(x){x.w.rng=1;const c=cover(x.w,x.dam.id,x.sire.id);assert.ok(c.conceived);x.w.day=c.dueDay;const h=foal(x.w,c);assert.ok(h);return {c,h};}
test('mare recovers exactly six months after birth, independent of foal weaning, and can produce a second foal',()=>{
 const x=make(),{c,h}=birth(x),record=structuredClone(c);
 assert.equal(x.dam.postFoalingUntil,h.born+180);
 x.w.day=h.born+179;assert.match(coveringReason(x.w,x.dam,x.sire),/recovery/);assert.equal(pregnancySummary(x.w,x.dam).stage,'Nursing / postpartum');
 x.w.day++;assert.notEqual(h.youngstock.weaning.stage,'complete');assert.equal(coveringReason(x.w,x.dam,x.sire),null);assert.equal(pregnancySummary(x.w,x.dam).stage,'Open');
 assert.match(pregnancyCard(x.w,x.dam),/Next covering from/);
 const second=birth(x);assert.notEqual(second.h.id,h.id);assert.deepEqual(c,record);assert.equal(x.w.pregnancies.filter(p=>p.status==='foaled'&&p.mareId===x.dam.id).length,2);
 validate(x.w);assert.deepEqual(decode(encode(x.w)),x.w);
});
test('old saves with 45-day recovery and stale completed pregnancy pointers use birth plus 180 days',()=>{
 const x=make(),{c,h}=birth(x);x.dam.postFoalingUntil=h.born+45;x.dam.pregnancy=c.id;x.dam.activeBreedingAttempt=c.id;
 upgrade(x.w);assert.equal(x.dam.pregnancy,null);let w=decode(encode(x.w)),dam=w.horses[x.dam.id],sire=w.horses[x.sire.id];
 w.day=h.born+179;assert.match(coveringReason(w,dam,sire),/recovery/);
 w.day++;assert.equal(coveringReason(w,dam,sire),null);assert.equal(pregnancySummary(w,dam).stage,'Open');w.rng=1;assert.doesNotThrow(()=>cover(w,dam.id,sire.id));
});
test('cross-country natural covering works with owned or NPC studs and preserves locations and contracts',()=>{
 for(const npc of [false,true]){
  const x=make();x.dam.location='USA';x.sire.location='UK';x.sire.arrivalDay=x.w.day+10;
  if(npc)x.sire.owner=Object.keys(x.w.owners).find(id=>!['player','archive'].includes(id));
  assert.equal(coveringReason(x.w,x.dam,x.sire),null);x.w.rng=1;const c=cover(x.w,x.dam.id,x.sire.id);
  assert.equal(c.registryEligibility,'official');assert.equal(x.w.studContracts.at(-1).sireId,x.sire.id);assert.equal(x.sire.location,'UK');assert.equal(x.dam.location,'USA');
  assert.throws(()=>cover(x.w,x.dam.id,x.sire.id),/covered|gestation/);
 }
});
function learner(days){const x=make(),h=x.dam;h.status='active';h.brood=false;h.born=x.w.day-days;h.autoTrain=false;h.clearance='Race-Cleared';h.fatigue=0;h.youngstock.starting.status='not_started';h.youngstock.starting.step=0;h.youngstock.starting.completedDay=null;for(const m of h.youngstock.starting.milestones){m.status='pending';m.attempts=0;}return {...x,h};}
test('manual base workouts work from 24 months even with incomplete starting and automatic training off',()=>{
 const {w,h}=learner(720),before=h.skills.speed,lessons=h.youngstock.education.length;
 assert.equal(train(w,h,true,'Sprint work'),true);assert.equal(w.sessions.at(-1).activity,'Sprint work');assert.ok(h.skills.speed>before);assert.equal(h.youngstock.education.length,lessons);assert.equal(h.youngstock.starting.status,'not_started');
 assert.equal(educationSession(w,h,'halter'),false);assert.doesNotMatch(youngstockProfile(w,h),/data-form="education"/);
 assert.equal(train(w,h,true,'Sprint work'),false); // no duplicate session
});
test('a horse below 24 months still receives age-appropriate education',()=>{
 const {w,h}=learner(719);assert.equal(train(w,h,true,'Sprint work'),true);assert.notEqual(w.sessions.at(-1).activity,'Sprint work');assert.equal(h.youngstock.education.length,1);
});
test('automatic starting still finishes and regular planned workouts follow without youngstock lessons',()=>{
 const {w,h}=learner(720);h.autoTrain=true;h.trainingPlan='Sprint work';h.temperament=100;h.spookiness=0;for(const k of Object.keys(h.youngstock.skills))h.youngstock.skills[k]=100;
 const lessons=h.youngstock.education.length;let baseWorkouts=0;
 for(let day=1;day<=100;day++){w.day=day;h.fatigue=0;h.soundness=100;scheduledTraining(w,h);if(w.sessions.at(-1)?.day===day&&w.sessions.at(-1)?.activity==='Sprint work')baseWorkouts++;}
 assert.equal(h.youngstock.starting.status,'complete');assert.ok(baseWorkouts>0);assert.equal(h.youngstock.education.length,lessons);
});
test('adult base workouts retain medical and travel restrictions',()=>{
 const {w,h}=learner(720);h.clearance='No Work';assert.equal(train(w,h,true,'Sprint work'),false);h.clearance='Race-Cleared';h.travelState='InTransit';assert.equal(train(w,h,true,'Sprint work'),false);
});
