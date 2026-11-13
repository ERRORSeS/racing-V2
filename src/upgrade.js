import { RULES, COUNTRIES } from './rules.js';
// Deterministic additive upgrade: never reroll existing identities, genetics or history.
export function upgrade(w) {
  if(w.schema!==1&&w.schema!==2)throw Error('Unsupported save version. Original data has not been changed.');
  w.settings??={registryMode:'official',injuryFrequency:1,fatalities:false,operatingCosts:false,instantTravel:true,avoidCloseBreeding:true,autoRace:false,debug:false,expandedGenetics:false,theme:'light'};
  w.settings={registryMode:'official',injuryFrequency:1,fatalities:false,operatingCosts:false,instantTravel:true,avoidCloseBreeding:true,autoRace:false,debug:false,expandedGenetics:false,theme:'light',...w.settings};
  w.results??={};w.medical??=[];w.visits??=[];w.coverings??=[];w.freezer??=[];w.staff??=[];w.jockeys??=[];w.journalClearedThrough??=0;
  for(const [key,o] of Object.entries(w.owners)){o.balance??=key==='archive'?'0':'5000000000';o.reputation??=50;}
  for(const h of Object.values(w.horses)){
    h.traits??=[];h.condition??=5;h.hoofHealth??=100;h.farrierDue??=w.day+45;h.clearance??='Race-Cleared';h.medicalCase??=null;h.autoCare??=true;h.autoVet??=true;h.autoFarrier??=true;h.gear??={bit:'Snaffle',accessory:'None',fit:100};h.location??=h.country;h.arrivalDay??=w.day;h.lastRaceDay??=null;h.retiredDay??=null;h.registryEligibility??='official';h.breedingMethod??='natural';h.brood??=false;h.pregnancy??=null;h.postFoalingUntil??=0;h.inspection??=null;h.ownership??=[{owner:h.owner,day:0,price:'0',seller:null}];h.studFee??='500000';h.coat.grayGene??=h.coat.gray?'Gg':'gg';h.coat.tobiano??=false;h.coat.tobianoGene??=h.coat.tobiano?'Tt':'tt';
  }
  for(const l of w.listings){l.seller??=w.horses[l.horseId]?.owner;l.kind??='private';l.reserve??=l.price;l.bids??=[];l.closed??=false;l.day??=w.day;l.endDay??=w.day+7;}
  // Upgrade already-open reference fixtures only. Closed legacy fixtures stay archived.
  for(const f of w.fixtures){f.entries??=[];f.maxRunners??=12;f.minAge??=2;f.maxAge??=12;f.grade??='Maiden';f.purse??='3000000';f.fee??='10000';f.going??='good';f.resultId??=null;}
  if(!w.jockeys.length){let index=0;for(const country of Object.keys(COUNTRIES))for(let n=0;n<14;n++)w.jockeys.push({id:`jockey-initial-${index++}`,name:`${['Alex','Sam','Robin','Kai','Taylor','Morgan','Jamie'][n%7]} ${['Vale','Reed','Aoki','Hayes','Blake','Mori','Quinn','Carter','Rowan','Hill','Ward','Frost','Lake','West'][n]}`,country,age:21+n,start:55+n*3,pace:60+n*2,finish:50+n*3,fee:String(10000+n*5000),starts:0,wins:0});}
  w.schema=RULES.schema;return w;
}
