import { initializeForm } from './form.js';
import { initializeYoungstock } from './youngstock.js';
import { invalidateSchedule } from './reservations.js';
import { publishEvent } from './media.js';
import { initializeTraits } from './traits.js';
import { initializeDevelopment, applyStarterOverrides, distanceFromGenome } from './development.js';
import { phenotypeDescription } from './genetics.js';
import {RULES,COUNTRIES,SKILLS,MOODS,TRAITS,age,cents} from './rules.js';
import {seed,integer,pick,id,name} from './random.js';
export function event(w,type,text,horseId=null){const e={id:`timeline-${w.events.length+1}`,day:w.day,type,text,horseId};w.events.push(e);publishEvent(w,e);}
export function horse(w,owner,country,options={},depth=0,born=-720){
 if(!COUNTRIES[country]||!w.owners[owner])throw Error('Invalid horse country or owner.');if(options.sex&&!['filly','colt','gelding'].includes(options.sex))throw Error('Invalid horse sex.');
 const h={id:id(w,'horse'),name:name(w),breed:'Thoroughbred',owner,breeder:owner,country,born,sex:options.sex||pick(w,['filly','colt','gelding']),status:'active',sire:null,dam:null,historyRecorded:false,starts:[],formerNames:[],potential:{},skills:{},temperament:options.temperament??integer(w,15,95),spookiness:options.spookiness??integer(w,5,90),soundness:100,fitness:55,fatigue:0,mood:'Neutral',preferredMood:pick(w,MOODS),turnout:8,feed:'Balanced',autoTrain:false,traits:[],condition:5,hoofHealth:100,farrierDue:w.day+45,clearance:'Race-Cleared',medicalCase:null,autoCare:true,autoVet:true,autoFarrier:true,gear:{bit:'Snaffle',accessory:'None',fit:100},location:country,arrivalDay:w.day,lastRaceDay:null,retiredDay:null,registryEligibility:'official',breedingMethod:'natural',brood:false,pregnancy:null,postFoalingUntil:0,inspection:null,coat:{extension:pick(w,['EE','Ee','ee']),agouti:pick(w,['AA','Aa','aa']),shade:pick(w,['Light','Medium','Dark']),gray:pick(w,[false,false,false,true]),face:pick(w,['None','Star','Blaze','Snip']),legs:Array.from({length:4},()=>pick(w,['None','Sock','Pastern']))},conformation:Object.fromEntries(['headNeck','shoulder','back','loin','hip','forelegs','hindlegs','hooves','balance','strideMechanics','chest','muscularDevelopment'].map(k=>[k,integer(w,40,100)/10]))};
 for(const k of SKILLS){h.potential[k]=options.potential??integer(w,45,99);h.skills[k]=Math.min(h.potential[k],options.ability??integer(w,20,45));}
 h.ownership=[{owner,day:w.day,price:'0',seller:null}];h.studFee='500000';h.coat.grayGene=h.coat.gray?'Gg':'gg';h.coat.tobianoGene=options.tobiano?'Tt':'tt';
 h.traits=[...new Set(Array.from({length:3},()=>pick(w,TRAITS)))];
 h.surface=options.surface||COUNTRIES[country].surface;h.distance=options.distance||pick(w,[1200,1600,2000,2400]);if(options.base==='chestnut')h.coat.extension='ee';if(options.base==='black'){h.coat.extension='EE';h.coat.agouti='aa';}if(options.base==='bay'){h.coat.extension='EE';h.coat.agouti='AA';}if(options.shade)h.coat.shade=options.shade;if(options.gray!=null)h.coat.gray=options.gray;if(options.face)h.coat.face=options.face;h.coat.tobiano=!!options.tobiano;h.coat.grayGene=h.coat.gray?'Gg':'gg';
 w.horses[h.id]=h;invalidateSchedule(w);
 if(options.sireId||options.damId){h.sire=options.sireId||null;h.dam=options.damId||null;}else if(depth>0){const sire=horse(w,'archive',country,{sex:'colt'},depth-1,born-1800),dam=horse(w,'archive',country,{sex:'filly'},depth-1,born-2160);sire.status=dam.status='retired';h.sire=sire.id;h.dam=dam.id;
}
 initializeTraits(w,h,true);initializeDevelopment(w,h,true);applyStarterOverrides(h,options);h.distance=options.distance||distanceFromGenome(h);initializeYoungstock(w,h,{fresh:true});initializeForm(w,h);

 return h;
}
export function rename(w,horseId,newName){const h=w.horses[horseId];if(!h||h.owner!=='player')throw Error('Only owned horses may be renamed.');newName=newName.trim();if(!newName||newName.length>18||Object.values(w.horses).some(x=>x.id!==h.id&&x.name.toLowerCase()===newName.toLowerCase()))throw Error('Use a unique registered name of 1–18 characters.');h.formerNames.push(h.name);h.name=newName;event(w,'identity',`Registered name changed to ${newName}.`,h.id);}
export function transact(w,amount,category,source){const next=BigInt(w.balance)+BigInt(amount);if(!w.unlimited&&next<0n)throw Error('Insufficient funds.');w.balance=next.toString();w.ledger.push({id:id(w,'ledger'),day:w.day,amount:String(amount),category,source,balance:w.balance});}
export function setBalance(w,value){const amount=cents(value);transact(w,BigInt(amount)-BigInt(w.balance),'Creative Balance Adjustment','settings');}
export function phenotype(h,day=0){return phenotypeDescription(h,day);}

export function ownedHorse(w, horseId) { const h=w.horses[horseId]; if(!h || h.owner!=='player')throw Error('Choose a horse you own.');return h; }
export function charge(w,h,amount,category,source) {
 if(h.owner==='player')transact(w,-BigInt(amount),category,source);
 else if(w.owners[h.owner] && h.owner!=='archive'){const o=w.owners[h.owner];if(BigInt(o.balance||'0')<BigInt(amount))throw Error('Stable budget cannot cover this service.');o.balance=(BigInt(o.balance)-BigInt(amount)).toString();}
}
export function journal(w){ const cursor=w.journalClearedThrough||0;return w.events.filter((e,i)=>i>=cursor&&(!e.horseId||w.horses[e.horseId]?.ownership?.some(o=>o.owner==='player'))); }
export function clearJournal(w){w.journalClearedThrough=w.events.length;}
export function changeCountry(w,country){if(!COUNTRIES[country])throw Error('Choose a supported country.');const old=w.country;w.country=country;w.owners.player.country=country;event(w,'stable',`Home jurisdiction changed from ${old} to ${country}. Horse birth countries and racing-age rules are preserved.`);}

export function scratchEntries(w,h,reason) {
  for(const f of w.fixtures)for(const e of f.entries||[])if(e.horseId===h.id&&f.status==='scheduled'){
    if(e.owner==='player'&&e.fee) { // Refund a welfare scratch exactly once.
      w.balance=(BigInt(w.balance)+BigInt(e.fee)).toString();w.ledger.push({id:id(w,'ledger'),day:w.day,amount:e.fee,category:'Welfare scratch refund',source:f.id,balance:w.balance});
    }
    f.entries=f.entries.filter(x=>x!==e);invalidateSchedule(w);event(w,'racing',`${h.name} scratched: ${reason}.`,h.id);
  }
}
