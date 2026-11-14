import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,advanceWorld} from '../src/world.js';import {resolveRace} from '../src/racing.js';import {validate} from '../src/storage.js';
const make=()=>createWorld({country:'USA',seed:'full-fields',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{}]});
test('An exhausted jockey pool is replenished with real unique riders and the race runs',()=>{const w=make(),f=w.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden');w.fixtures=[f];w.calendarGenerationLog=[];w.jockeys=w.jockeys.slice(0,1);f.entries=[];w.day=f.day;w.settings.injuryFrequency=0;const r=resolveRace(w,f.id);assert.ok(r);assert.equal(f.status,'completed');assert.ok(r.rows.length>=2);assert.equal(new Set(r.rows.map(row=>row.jockeyId)).size,r.rows.length);assert.ok(w.jockeys.length>1);validate(w);});
test('A whole month has no capacity cancellations; ordinary reserves have real identities and parents',()=>{const w=make();w.settings.injuryFrequency=0;advanceWorld(w,30);assert.equal(w.fixtures.filter(f=>f.status==='canceled').length,0);assert.ok(Object.keys(w.results).length>150);for(const h of Object.values(w.horses).filter(h=>h.circuitReserveFor)){assert.ok(w.horses[h.sire]);assert.ok(w.horses[h.dam]);assert.equal(h.owner==='player',false);}validate(w);});

test('Fatigue fades faster; zero safe years raises risk without locking an eligible horse',async()=>{const {dailyCare}=await import('../src/care.js'),{eligibility}=await import('../src/racing.js'),{racingYearsRisk}=await import('../src/racing-years.js');const w=make(),h=Object.values(w.horses).find(h=>h.owner==='player');h.fatigue=50;w.day=1;dailyCare(w,h);assert.ok(h.fatigue<40);h.fatigue=0;h.safeRacingYears=0;assert.equal(eligibility(w,h,w.fixtures.find(f=>f.country==='USA'&&f.classId==='maiden')),null);assert.ok(racingYearsRisk(h)>1);});
test('Vet therapy increases remaining safe racing years without increasing inherited ability',async()=>{const {startTherapy,recoveryDay}=await import('../src/recovery.js');const w=make(),h=Object.values(w.horses).find(h=>h.owner==='player'),caps=structuredClone(h.potential);h.safeRacingYears=0;startTherapy(w,h.id,6);w.day=180;recoveryDay(w,h);assert.equal(h.safeRacingYears,.5);assert.deepEqual(h.potential,caps);});


test('Long remaining soundness never grants immunity to training or race injuries',async()=>{
  const {exposure}=await import('../src/care.js');
  const {racingYearsRisk}=await import('../src/racing-years.js');
  for(const context of ['training','race']){
    const w=make(),h=Object.values(w.horses).find(h=>h.owner==='player');
    h.safeRacingYears=10;h.fatigue=0;h.hoofHealth=100;
    w.settings.injuryFrequency=1;w.settings.fatalities=false;
    // Xorshift seed 1 produces a small positive first draw: a rare,
    // ordinary-frequency injury, without exhausting the soundness reserve.
    w.rng=1;
    assert.equal(racingYearsRisk(h),1);
    const injury=exposure(w,h,context);
    assert.ok(injury,`${context} must retain baseline injury risk`);
    assert.ok(h.medicalCase);
    assert.ok(h.safeRacingYears>0);
    assert.ok(racingYearsRisk({safeRacingYears:0})>racingYearsRisk(h));
  }
});
