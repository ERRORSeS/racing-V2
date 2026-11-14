import { validateCareerTimeline } from './career-timeline.js';
import { inheritGenome, geneticCeilings, coatFromGenome, legacyGenome, matingGeneticRisk, incompatibleGenotypes } from './genetics.js';
import { distanceFromGenome } from './development.js';
import { traitModifiers } from './traits.js';
import { RULES, SKILLS, age, clamp } from './rules.js';
import { pick, integer, random, id } from './random.js';
import { horse, event, charge, ownedHorse } from './core.js';
import { kinship } from './career.js';

export function inheritPair(w,a,b) {return pick(w,a.split(''))+pick(w,b.split(''));}
export function inheritedCoat(w,sire,dam) {
 const sg=structuredClone(sire.genome||legacyGenome(sire)),dg=structuredClone(dam.genome||legacyGenome(dam));
 // Legacy API accepts a verified coat panel; new births use their canonical genomes directly.
 for(const [g,h]of [[sg,sire],[dg,dam]]){g.loci.MC1R.alleles=h.coat.extension.split('');g.loci.ASIP.alleles=h.coat.agouti.split('');g.loci.GRAY.alleles=(h.coat.grayGene||(h.coat.gray?'Gg':'gg')).split('');g.loci.TOBIANO.alleles=(h.coat.tobianoGene||'tt').split('');}
 return coatFromGenome(inheritGenome(w,sg,dg));
}
export function studBook(w,sire){validateCareerTimeline(w,sire);const year=Math.floor(w.day/360)+1;let book=w.studBooks.find(b=>b.sireId===sire.id&&b.year===year);if(!book){book={id:id(w,'book'),sireId:sire.id,year,capacity:60,reservations:[],advertisedFee:sire.studFee};w.studBooks.push(book);}return book;}
export function breedingReason(w,dam,sire) {
  if(!dam||!sire)return 'Choose a mare and stallion.';
  if(dam.sex!=='filly'||sire.sex!=='colt')return 'A mare must be the dam and a stallion the sire.';
  if(dam.status==='deceased'||sire.status==='deceased')return 'Both parents must be alive.';
  if(age(dam,w.day)<3||age(sire,w.day)<3)return 'Parents must be at least three racing years old.';
  if(sire.status!=='retired'||!sire.brood)return 'Stallion must be retired to stud.';
  if(!dam.brood||dam.status!=='retired')return 'Retire the mare for breeding first.';
  if(dam.pregnancy||dam.postFoalingUntil>w.day)return 'Mare is pregnant or in post-foaling recovery.';
  if(dam.medicalCase||sire.medicalCase||dam.soundness<65||sire.soundness<65)return 'Breeding soundness clearance required.';
  if(w.settings.avoidCloseBreeding&&kinship(w,dam.id,sire.id)>=.0625)return 'Pedigree overlap exceeds the selected 6.25% limit.';
  const risk=matingGeneticRisk(sire,dam);if(risk)return risk;
  const book=w.studBooks?.find(b=>b.sireId===sire.id&&b.year===Math.floor(w.day/360)+1);if(book&&book.reservations.length>=book.capacity)return 'Stallion book is full for this season.';
  return null;
}
export function cover(w,damId,sireId,method='natural',batchId=null,npc=false) {
  const dam=w.horses[damId],sire=w.horses[sireId];if(!npc)ownedHorse(w,damId);
  const reason=breedingReason(w,dam,sire);if(reason)throw Error(reason);
  if(!['natural','frozen'].includes(method))throw Error('Unknown breeding method.');
  const batch=w.freezer.find(b=>b.id===batchId);
  if(method==='frozen'){
    if(w.settings.registryMode!=='alternative')throw Error('Frozen-semen AI cannot produce an official registered racing TB. Choose the fictional alternative registry to use a dose.');
    if(!batch||batch.sireId!==sireId||batch.owner!==dam.owner||batch.doses<1||batch.viability<50)throw Error('A viable owned semen dose is required.');
  }
  if(method==='natural'&&(dam.location!==sire.location||dam.arrivalDay>w.day||sire.arrivalDay>w.day))throw Error('Natural service requires both horses settled at the same country/base; book travel first.');
  const book=studBook(w,sire);
  const fee=sire.owner===dam.owner?'0':(sire.studFee||'500000');
  charge(w,dam,fee,'Stud service',sire.id);
  if(sire.owner==='player'&&dam.owner!=='player'){
    w.balance=(BigInt(w.balance)+BigInt(fee)).toString();w.ledger.push({id:id(w,'ledger'),day:w.day,amount:fee,category:'Stud income',source:sire.id,balance:w.balance});
  }else if(sire.owner!==dam.owner&&w.owners[sire.owner])w.owners[sire.owner].balance=(BigInt(w.owners[sire.owner].balance||'0')+BigInt(fee)).toString();
  if(method==='frozen')batch.doses--;
  const fertility=clamp(.90-Math.max(0,age(dam,w.day)-12)*.025-Math.max(0,age(sire,w.day)-15)*.015+(traitModifiers(dam,{phase:'breeding'}).values.fertility||0),.45,.94);const conceived=random(w)<fertility;
  const c={id:id(w,'cover'),damId,sireId,owner:dam.owner,breeder:dam.owner,day:w.day,method,registryEligibility:method==='natural'?'official':'alternative',conceived,status:conceived?'pregnant':'not conceived',dueDay:conceived?w.day+integer(w,...RULES.gestation):null,fee,bookId:book.id,originRules:structuredClone(w.settings)};
  w.coverings.push(c);book.reservations.push(c.id);if(conceived)dam.pregnancy=c.id;else dam.postFoalingUntil=w.day+20;
  event(w,'breeding',`${dam.name} × ${sire.name}: ${conceived?'pregnancy established; foaling expected around day '+c.dueDay:'not conceived; reassessment in 20 days'}. ${method==='frozen'?'Fictional alternative registry.':'Natural covering.'}`,dam.id);return c;
}
export function foal(w,c) {
  if(c.status!=='pregnant'||c.dueDay>w.day)return null;
  const dam=w.horses[c.damId],sire=w.horses[c.sireId];
  if(dam.status==='deceased'){c.status='lost';dam.pregnancy=null;return null;}
  const h=horse(w,dam.owner,dam.location,{sex:pick(w,['filly','colt']),sireId:sire.id,damId:dam.id},0,w.day);
  h.sire=sire.id;h.dam=dam.id;h.breeder=c.breeder;h.historyRecorded=true;h.genome=inheritGenome(w,sire.genome,dam.genome);if(incompatibleGenotypes(h.genome))throw Error('Incompatible genotype was blocked by the breeding safeguards.');h.coat=coatFromGenome(h.genome);h.registryEligibility=c.registryEligibility;h.breedingMethod=c.method;h.skills=Object.fromEntries(SKILLS.map(k=>[k,5]));
  h.potential=geneticCeilings(h.genome);for(const key of SKILLS)h.skills[key]=Math.min(5,h.potential[key]*.25);h.originRules={coatMode:h.genome.modeAtBirth,registry:c.registryEligibility,creativeEdited:false};h.development.origin='geneticBirth';
  for(const k of Object.keys(h.conformation))h.conformation[k]=clamp(4.5+h.potential.balance/25+integer(w,-15,15)/10*(1-(traitModifiers(sire,{phase:'breeding'}).values.conformation||0)*5),1,10);
  h.temperament=clamp(h.potential.composure+integer(w,-10,10));h.spookiness=clamp(100-h.potential.focus+integer(w,-15,15));h.surface=['turf','dirt','synthetic'].sort((a,b)=>h.potential[b]-h.potential[a])[0];h.distance=distanceFromGenome(h);for(const t of h.traitInstances){t.source='inherited propensity expressed';t.manifestedDay=w.day;t.discoveredDay=null;t.provenance='Modeled predisposition expressed at birth; learned parental experiences are not inherited.';}

  dam.pregnancy=null;dam.postFoalingUntil=w.day+RULES.postFoalingRest;c.status='foaled';c.foalId=h.id;
  event(w,'birth',`${h.name} born to ${dam.name}, by ${sire.name}. ${h.registryEligibility==='alternative'?'Fictional alternative':'Official natural-service'} registry eligibility.`,h.id);event(w,'breeding',`${dam.name} foaled ${h.name}; ${RULES.postFoalingRest}-day recovery plan.`,dam.id);return h;
}
export function collect(w,sireId) {
  const h=ownedHorse(w,sireId);if(h.sex!=='colt'||h.status!=='retired'||!h.brood||age(h,w.day)<3||h.medicalCase)throw Error('Choose a mature, sound retired stud stallion.');
  if(w.freezer.some(b=>b.sireId===sireId&&b.day===w.day))throw Error('Collection already recorded today.');
  charge(w,h,RULES.collectionFee,'Semen collection',h.id);const b={id:id(w,'batch'),sireId,owner:'player',day:w.day,doses:5,viability:100,location:w.country};w.freezer.push(b);event(w,'freezer',`${h.name}: five doses collected for storage. Official TB racing requires natural service.`,h.id);return b;
}
export function dispose(w,batchId) {const b=w.freezer.find(x=>x.id===batchId&&x.owner==='player');if(!b)throw Error('Owned batch not found.');b.doses=0;event(w,'freezer',`Stored batch ${b.id} disposed.`,b.sireId);}

export function transferBatch(w,batchId,owner,country){const b=w.freezer.find(b=>b.id===batchId&&b.owner==='player');if(!b||!w.owners[owner]||owner==='archive')throw Error('Choose an owned batch and valid recipient.');if(!country||!Object.values(w.owners).some(o=>o.country===country))throw Error('Choose a valid destination.');b.owner=owner;b.location=country;event(w,'freezer',`Batch ${b.id} transferred to ${w.owners[owner].name}, stored in ${country}.`,b.sireId);}
