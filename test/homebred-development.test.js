import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {cover,foal} from '../src/breeding.js';
import {retire,dailyCare,scheduledTraining} from '../src/care.js';
import {youngstockDay,autoStartHorse} from '../src/youngstock.js';
import {breedingGenome,geneticCeilings,inheritGenome,breedingPreview} from '../src/genetics.js';
import {developBornHorse,usableCeiling} from '../src/development.js';
import {setNpcProgression} from '../src/fast-mode.js';
import {ensureCalendarHorizon} from '../src/race-catalog.js';
import {enterRace,resolveRace,travel} from '../src/racing.js';
import {processTravel} from '../src/travel.js';
import {validate,encode,decode} from '../src/storage.js';
import {age} from '../src/rules.js';
let base;
function make(n=0){
 base??=createWorld({country:'USA',seed:'homebred-winning-parents',historyYears:0,creativeMode:true,starters:[{}]});const w=structuredClone(base);w.settings.injuryFrequency=0;w.settings.avoidCloseBreeding=false;
 const winners=Object.values(w.horses).filter(h=>h.owner!=='archive'&&h.starts.some(s=>s.place===1)&&age(h,w.day)>=3&&!h.medicalCase).sort((a,b)=>(b.potential.speed+b.potential.stamina+b.potential.kick)-(a.potential.speed+a.potential.stamina+a.potential.kick));
 const dam=winners.find(h=>h.sex==='filly'),sire=winners.find(h=>h.sex==='colt');for(const h of [dam,sire]){if(h.owner!=='player'){h.ownership.push({owner:'player',day:w.day,price:'0',seller:h.owner});h.owner='player';}if(h.status==='active')retire(w,h.id);h.brood=true;}
 setNpcProgression(w,false);w.rng=n*100+1;const c=cover(w,dam.id,sire.id);assert.ok(c.conceived);w.day=c.dueDay;const h=foal(w,c);return {w,h,dam,sire};
}
test('explicit intrinsic potential participates in inheritance, while parental learned skill, wins and stored DNA remain untouched',()=>{
 const {w,dam,sire}=make(),stored=[JSON.stringify(dam.genome),JSON.stringify(sire.genome)],source=breedingGenome(sire);assert.ok(source.potentialOffsets);assert.deepEqual(geneticCeilings(source),sire.potential);
 const stream={rng:12345},first=inheritGenome(stream,breedingGenome(sire),breedingGenome(dam));for(const h of [dam,sire]){for(const key of Object.keys(h.skills))h.skills[key]=0;h.starts=[];}
 assert.deepEqual(inheritGenome({rng:12345},breedingGenome(sire),breedingGenome(dam)),first);assert.deepEqual([JSON.stringify(dam.genome),JSON.stringify(sire.genome)],stored);assert.ok(breedingPreview(sire,dam).speed.mean>80);
});
test('birth uses a single inherited genome consistently, newborns stay untrained, and growth is capped and idempotent',()=>{
 const {w,h}=make();assert.ok(Object.values(h.skills).every(v=>v<=5));assert.deepEqual(h.potential,geneticCeilings(h.genome));const dna=JSON.stringify(h.genome),caps={...h.potential};
 w.day=h.born+720;youngstockDay(w,h);assert.ok(h.skills.speed>30);assert.ok(h.skills.recovery>20);assert.ok(h.skills[h.surface]>30);const skills={...h.skills};developBornHorse(w,h);assert.deepEqual(h.skills,skills);
 assert.equal(JSON.stringify(h.genome),dna);assert.deepEqual(h.potential,caps);for(const key of Object.keys(h.skills))assert.ok(h.skills[key]<=usableCeiling(h,key,w.day));
});
test('existing homebreds gain a birth marker from permanent records and catch up without rerolling DNA or past races',()=>{
 const {w,h}=make(),dna=JSON.stringify(h.genome),caps={...h.potential},past=JSON.stringify(w.results);delete h.foalingRecordId;w.day=h.born+900;
 const saved=decode(encode(w)),old=saved.horses[h.id];assert.ok(old.foalingRecordId);assert.ok(Object.values(old.skills).every(v=>v<=5));old.clearance='No Work';assert.equal(developBornHorse(saved,old),false);old.clearance='Race-Cleared';youngstockDay(saved,old);assert.ok(old.skills.speed>30);assert.equal(JSON.stringify(old.genome),dna);assert.deepEqual(old.potential,caps);assert.equal(JSON.stringify(saved.results),past);validate(saved);
});
test('prepared homebreds of recorded winners can win genuine maiden races through the unchanged race engine',()=>{
 let wins=0,placed=0;const caps=new Set();
 for(let n=0;n<6;n++){
  const {w,h,dam,sire}=make(n),past=JSON.stringify(w.results);assert.ok(dam.starts.some(s=>s.place===1)&&sire.starts.some(s=>s.place===1));caps.add(h.potential.speed);
  w.day=h.born+720;youngstockDay(w,h);autoStartHorse(w,h.id);for(let d=1;d<=180;d++){w.day=h.born+720+d;youngstockDay(w,h);dailyCare(w,h);scheduledTraining(w,h);}h.autoTrain=false;
  ensureCalendarHorizon(w);const f=w.fixtures.filter(f=>f.classId==='maiden'&&f.status==='scheduled'&&f.day>w.day&&f.surface===h.surface&&age(h,f.day)>=f.minAge&&age(h,f.day)<=f.maxAge).sort((a,b)=>Math.abs(a.distance-h.distance)-Math.abs(b.distance-h.distance)||a.day-b.day)[0];assert.ok(f);if(h.location!==f.country)travel(w,h.id,f.country);
  const j=w.jockeys.find(j=>j.country===f.country&&!w.fixtures.some(x=>x.day===f.day&&x.entries.some(e=>e.jockeyId===j.id)));enterRace(w,f.id,h.id,j.id);while(w.day<f.day){w.day++;processTravel(w);dailyCare(w,h);}const result=resolveRace(w,f.id);assert.ok(result,JSON.stringify(w.events.slice(-3)));const row=result.rows.find(r=>r.horseId===h.id);assert.ok(result.rows.length>=2);wins+=row.place===1;placed+=row.place<=3;
  const before=JSON.parse(past);for(const [id,record]of Object.entries(before))assert.deepEqual(w.results[id],record);validate(w);
 }
 assert.ok(wins>0,'Developed homebreds should be capable of winning');assert.ok(placed>0);assert.ok(caps.size>1,'Offspring retain genetic variation');
});
