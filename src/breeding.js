import { RULES, SKILLS, age, clamp } from './rules.js';
import { pick, integer, random, id } from './random.js';
import { horse, event, charge, ownedHorse } from './core.js';
import { kinship } from './career.js';

export function inheritPair(w,a,b) {return pick(w,a.split(''))+pick(w,b.split(''));}
export function inheritedCoat(w,sire,dam) {
  const extension=inheritPair(w,sire.coat.extension,dam.coat.extension),agouti=inheritPair(w,sire.coat.agouti,dam.coat.agouti);
  const grayGene=inheritPair(w,sire.coat.grayGene|| (sire.coat.gray?'Gg':'gg'),dam.coat.grayGene||(dam.coat.gray?'Gg':'gg'));
  const tobianoGene=inheritPair(w,sire.coat.tobianoGene||(sire.coat.tobiano?'Tt':'tt'),dam.coat.tobianoGene||(dam.coat.tobiano?'Tt':'tt'));
  return {extension:extension.includes('E')?extension==='eE'?'Ee':extension:'ee',agouti:agouti==='aA'?'Aa':agouti,grayGene,gray:grayGene.includes('G'),tobianoGene,tobiano:tobianoGene.includes('T'),shade:random(w)<.7?pick(w,[sire.coat.shade,dam.coat.shade]):pick(w,['Light','Medium','Dark']),face:pick(w,[sire.coat.face,dam.coat.face,'Star','None','Snip']),legs:Array.from({length:4},(_,i)=>pick(w,[sire.coat.legs[i],dam.coat.legs[i],'None']))};
}
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
  const fee=sire.owner===dam.owner?'0':(sire.studFee||'500000');
  charge(w,dam,fee,'Stud service',sire.id);
  if(sire.owner==='player'&&dam.owner!=='player'){
    w.balance=(BigInt(w.balance)+BigInt(fee)).toString();w.ledger.push({id:id(w,'ledger'),day:w.day,amount:fee,category:'Stud income',source:sire.id,balance:w.balance});
  }else if(sire.owner!==dam.owner&&w.owners[sire.owner])w.owners[sire.owner].balance=(BigInt(w.owners[sire.owner].balance||'0')+BigInt(fee)).toString();
  if(method==='frozen')batch.doses--;
  const conceived=random(w)<.86;
  const c={id:id(w,'cover'),damId,sireId,owner:dam.owner,breeder:dam.owner,day:w.day,method,registryEligibility:method==='natural'?'official':'alternative',conceived,status:conceived?'pregnant':'not conceived',dueDay:conceived?w.day+integer(w,...RULES.gestation):null,fee};
  w.coverings.push(c);if(conceived)dam.pregnancy=c.id;else dam.postFoalingUntil=w.day+20;
  event(w,'breeding',`${dam.name} × ${sire.name}: ${conceived?'pregnancy established; foaling expected around day '+c.dueDay:'not conceived; reassessment in 20 days'}. ${method==='frozen'?'Fictional alternative registry.':'Natural covering.'}`,dam.id);return c;
}
export function foal(w,c) {
  if(c.status!=='pregnant'||c.dueDay>w.day)return null;
  const dam=w.horses[c.damId],sire=w.horses[c.sireId];
  if(dam.status==='deceased'){c.status='lost';dam.pregnancy=null;return null;}
  const h=horse(w,dam.owner,dam.location,{sex:pick(w,['filly','colt'])},0,w.day);
  h.sire=sire.id;h.dam=dam.id;h.breeder=c.breeder;h.historyRecorded=true;h.coat=inheritedCoat(w,sire,dam);h.registryEligibility=c.registryEligibility;h.breedingMethod=c.method;h.skills=Object.fromEntries(SKILLS.map(k=>[k,5]));
  for(const k of SKILLS)h.potential[k]=clamp((sire.potential[k]+dam.potential[k])/2+integer(w,-12,12),10,100);
  for(const k of Object.keys(h.conformation))h.conformation[k]=clamp((sire.conformation[k]+dam.conformation[k])/2+integer(w,-6,6)/10,1,10);
  h.temperament=clamp((sire.temperament+dam.temperament)/2+integer(w,-15,15));h.spookiness=clamp((sire.spookiness+dam.spookiness)/2+integer(w,-15,15));h.surface=pick(w,[sire.surface,dam.surface]);h.distance=Math.round((sire.distance+dam.distance)/400)*200;h.traits=[...new Set([pick(w,sire.traits),pick(w,dam.traits),...h.traits.slice(0,1)])];
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
