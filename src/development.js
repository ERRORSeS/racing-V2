import { traitModifiers } from './traits.js';
import { SKILL_DEFINITIONS, SKILL_IDS } from './skill-definitions.js';
import { founderGenome, inheritGenome, legacyGenome, geneticCeilings, coatFromGenome, incompatibleGenotypes } from './genetics.js';
import { clamp } from './rules.js';
import { seed, integer } from './random.js';
export function initializeDevelopment(w,h,fresh=false){
 if(!h.genome){
  if(fresh){const sire=w.horses[h.sire],dam=w.horses[h.dam];h.genome=sire?.genome&&dam?.genome?inheritGenome(w,sire.genome,dam.genome):founderGenome(w,!!w.settings?.expandedGenetics);for(let attempt=0;incompatibleGenotypes(h.genome)&&attempt<100;attempt++)h.genome=inheritGenome(w,sire.genome,dam.genome);if(incompatibleGenotypes(h.genome))throw Error('Unable to seed a viable lineage.');h.coat=coatFromGenome(h.genome);h.potential=geneticCeilings(h.genome);}
  else {h.genome=legacyGenome(h,w.seed);const mean=Object.values(h.potential).reduce((a,b)=>a+b,0)/Object.keys(h.potential).length,shift=(mean-58)/29;for(const block of Object.values(h.genome.quantitativeHaplotypes))for(const hap of block)for(let i=0;i<hap.length;i++)hap[i]=clamp(Math.round(hap[i]+shift),0,4);}
 }
 const local={rng:seed(`${w.seed}:${h.id}:skill-migration`)},existing=Object.values(h.potential).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(h.potential).length),current=Object.values(h.skills).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(h.skills).length);
 for(const key of SKILL_IDS){h.potential[key]??=clamp(Math.round(existing+integer(local,-12,12)),1,100);h.skills[key]??=Math.min(h.potential[key],Math.max(0,Math.round(current+integer(local,-8,8))));if(fresh)h.skills[key]=Math.min(h.skills[key],h.potential[key]);}
 h.development??={origin:fresh?'geneticBirth':'legacyInferred',version:1,lastProgress:{},plateaus:{},educationEvents:[]};
 h.originRules??={coatMode:h.genome.modeAtBirth,registry:w.settings?.registryMode||'official',creativeEdited:false};
 h.potentialSoundnessCeiling??=Math.max(h.soundness,100);h.irreversibleSoundnessLimit??=100;h.soundnessHistory??=[];h.breakPlan??=null;h.trainingPlan??='Auto Balanced';h.workoutCounts??={};h.autoTravel??=false;h.autoRecovery??=true;h.travelState??='AtHome';h.locationVenue??='Home stable';
 h.estimatedCeilings??={};
 return h;
}
export function applyStarterOverrides(h,opts){
 if(opts.potential!=null)for(const k of SKILL_IDS)h.potential[k]=opts.potential;
 if(opts.ability!=null)for(const k of SKILL_IDS)h.skills[k]=Math.min(h.potential[k],opts.ability);
 let edited=false;const set=(key,a)=>{h.genome.loci[key]={alleles:a,confidence:'verified',mode:h.genome.loci[key].mode};edited=true;};
 if(opts.base==='chestnut')set('MC1R',['e','e']);if(opts.base==='black'){set('MC1R',['E','E']);set('ASIP',['a','a']);}if(opts.base==='bay'){set('MC1R',['E','E']);set('ASIP',['A','A']);}
 if(opts.gray!=null)set('GRAY',opts.gray?['G','g']:['g','g']);if(opts.tobiano)set('TOBIANO',['T','t']);
 if(opts.shade)h.genome.modifierAlleles.shade={Light:15,Medium:50,Dark:85}[opts.shade];
 h.coat=coatFromGenome(h.genome,{face:opts.face||h.coat.face,legs:h.coat.legs});
 if(opts.potential!=null||edited){h.originRules.creativeEdited=true;h.genome.parentageStatus='creativeEdited';}
}
const maturityCache=new WeakMap();
export function maturityFactor(h,day,key){
 if(!SKILL_DEFINITIONS[key]?.physical)return 1;
 const cached=maturityCache.get(h);if(cached?.day===day)return cached.value;
 const years=(day-h.born)/360,late=h.traits.includes('Late Developer')||h.traits.includes('Late Maturer');
 const store=value=>{maturityCache.set(h,{day,value});return value;};if(years<2)return store(clamp(.25+years*.25,.2,.8));
 if(years<4){const m=traitModifiers(h,{phase:'maturity'}).values,inherited=((h.genome?.quantitativeHaplotypes?.SIM_BLOCK_0?.[0]?.[0]??2)-2)*.015;return store(Math.min(1,(late?.77:.84)+(years-2)*(late?.09:.08)+(m.earlyMaturity||0)+inherited));}
 return store(Math.max(.65,1-Math.max(0,years-9)*.018));
}
export function usableCeiling(h,key,day){const innate=h.potential[key],mature=innate*maturityFactor(h,day,key),safe=SKILL_DEFINITIONS[key]?.physical?innate*(h.irreversibleSoundnessLimit??100)/100:innate;return Math.min(innate,mature,safe);}
export function potentialEstimate(h,key){
 const n=(h.starts.length*2+(h.workoutCounts?.[key]||0)/3),width=Math.max(3,18-Math.sqrt(n)*2),bias=(seed(`${h.id}:${key}:scout`)%9)-4;
 return {low:Math.max(h.skills[key],Math.round(h.potential[key]+bias-width)),high:Math.max(h.skills[key],clamp(Math.round(h.potential[key]+bias+width))),confidence:Math.min(.95,.2+n/100)};
}
export function classProjection(h,context={}){
 const distance=context.distance||h.distance,surface=context.surface||h.surface,caps=h.potential,match=clamp(1-Math.abs(distance-h.distance)/18000,.72,1),surfaceFactor=.88+(caps[surface]??60)/850;
 const score=(caps.speed*.36+caps.stamina*.20+caps.kick*.14+caps.acceleration*.10+caps.cruising*.10+caps.tactical*.10)*match*surfaceFactor*(h.irreversibleSoundnessLimit??100)/100;
 const labels=['Entry / Maiden / Local','Claiming / Low Allowance','Allowance / Handicap / Conditions','Upper Handicap / Listed Candidate','Listed / Stakes Level','Group/Grade 3 Contender','Group/Grade 2 Contender','Group/Grade 1 Contender','Exceptional / Championship-Class'];
 const thresholds=[45,55,64,71,77,83,88,94],index=thresholds.filter(t=>score>=t).length;
 const evidence=h.starts.length,uncertain=evidence<3;
 return {score,band:uncertain?'Unproven':labels[index],low:labels[Math.max(0,index-(uncertain?2:1))],high:labels[Math.min(labels.length-1,index+1)],confidence:Math.min(.95,.2+evidence*.04),note:'A competitiveness estimate at best mature preparation, not permission to enter or a guaranteed racing level.'};
}
export function distanceFromGenome(h){const p=h.potential,alleles=h.genome?.loci.MSTN?.alleles,shift=alleles?.includes(null)?0:alleles?.filter(a=>a==='T').length*180-180;return Math.round(clamp(1600+(p.stamina-p.speed)*18+shift,900,3200)/100)*100;}
