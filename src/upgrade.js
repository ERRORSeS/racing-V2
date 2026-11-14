import { initializeDurability } from './durability.js';
import { initializeRacingYears } from './racing-years.js';
import { attachAuction, rotateAuctions } from './auction-catalog.js';
import { renewCalendar, ensureRaceTypeCoverage, ensureYoungProgression, openGradedRaceAges, ensureCalendarHorizon } from './race-catalog.js';
import { initializeForm } from './form.js';
import { initializeYoungstock } from './youngstock.js';
import { initializeTraits } from './traits.js';
import { initializeDevelopment } from './development.js';
import { RULES, COUNTRIES } from './rules.js';
// Deterministic additive upgrade: never reroll existing identities, genetics or history.
export function upgrade(w) {
  const previousSchema=w.schema;
  if(![1,2,3,5,6,7].includes(w.schema))throw Error('Unsupported save version. Original data has not been changed.');
  w.settings??={registryMode:'official',injuryFrequency:1,fatalities:false,operatingCosts:false,instantTravel:true,avoidCloseBreeding:true,autoRace:false,debug:false,expandedGenetics:false,theme:'light'};
  w.settings={registryMode:'official',injuryFrequency:1,fatalities:false,operatingCosts:false,instantTravel:true,avoidCloseBreeding:true,autoRace:false,debug:false,expandedGenetics:false,theme:'light',...w.settings};
  w.settings.fieldDensity??='Balanced';w.settings.creativeMode??=false;w.settings.revealPotential??=false;w.settings.historyYears??=10;
  w.auctionEvents??=[];w.auctionGenerationLog??=[];w.qualifyingPoints??=[];w.calendarGenerationLog??=[];w.travel??=[];w.news??=[];w.awards??=[];w.trackRecords??=[];w.studBooks??=[];w.notifications??=[];w.followedStables??=[];w.pressResponses??=[];w.followedHorses??=[];w.bookmarks??=[];w.historySeeded??=false;
  w.results??={};w.medical??=[];w.visits??=[];w.coverings??=[];w.freezer??=[];w.staff??=[];w.jockeys??=[];w.journalClearedThrough??=0;
  for(const [key,o] of Object.entries(w.owners)){o.balance??=key==='archive'?'0':'5000000000';o.reputation??=50;}
  w.settings.eliteJuvenileCatalogChance??=.02;w.settings.maximumRacingCareerYears??=5;
  for(const h of Object.values(w.horses)){
    h.trainingIntensity??='Balanced';h.protectRecovery??=true;h.fatigueLog??=[];h.workloadLoad7d??=0;h.workloadLoad28d??=0;h.autoRace??=!!w.settings.autoRace&&h.owner==='player';h.autoRaceInterval??=21;h.autoRaceMaxTier??='Auto';h.autoRaceGoal??='General';h.traits??=[];h.condition??=5;h.hoofHealth??=100;h.farrierDue??=w.day+45;h.clearance??='Race-Cleared';h.medicalCase??=null;h.autoCare??=true;h.autoVet??=true;h.autoFarrier??=true;h.gear??={bit:'Snaffle',accessory:'None',fit:100};h.location??=h.country;h.arrivalDay??=w.day;h.lastRaceDay??=null;h.retiredDay??=null;h.registryEligibility??='official';h.breedingMethod??='natural';h.brood??=false;h.pregnancy??=null;h.postFoalingUntil??=0;h.inspection??=null;h.ownership??=[{owner:h.owner,day:0,price:'0',seller:null}];h.studFee??='500000';h.coat.grayGene??=h.coat.gray?'Gg':'gg';h.coat.tobiano??=false;h.coat.tobianoGene??=h.coat.tobiano?'Tt':'tt';
  }
  for(const h of Object.values(w.horses)){initializeDevelopment(w,h);initializeTraits(w,h);initializeYoungstock(w,h);initializeForm(w,h);initializeRacingYears(w,h);initializeDurability(w,h);const m=w.medical.find(m=>m.id===h.medicalCase);if(m&&h.irreversibleSoundnessLimit===100){h.irreversibleSoundnessLimit=Math.max(h.soundness,m.ceiling);h.potentialSoundnessCeiling=Math.max(h.soundness,Math.min(m.ceiling,h.potentialSoundnessCeiling));}}
  for(const m of w.medical){m.decision??=m.rehab?'treat_return':w.horses[m.horseId]?.owner==='player'?'pending':'treat_return';m.typeId??='custom';m.context??='recorded incident';}
  for(const h of Object.values(w.horses))if(h.status==='deceased'){h.medicalCase=null;h.brood=false;h.autoTrain=false;h.autoRace=false;}
  for(const l of w.listings){l.seller??=w.horses[l.horseId]?.owner;l.kind??='private';l.reserve??=l.price;l.bids??=[];l.closed??=false;l.day??=w.day;l.endDay??=w.day+7;}
  for(const l of w.listings)attachAuction(w,l);
  // Upgrade already-open reference fixtures only. Closed legacy fixtures stay archived.
  for(const f of w.fixtures){f.entries??=[];f.maxRunners??=12;f.minAge??=2;f.maxAge??=12;f.grade??='Maiden';f.purse??='3000000';f.fee??='10000';f.going??='good';f.resultId??=null;f.minStarters??=2;f.targetFieldSize??=8;f.phase??=f.status==='completed'?'Settled':f.status==='canceled'?'Canceled':'EntriesOpen';f.conditions??={};f.course??={direction:'left',turns:2,undulating:false};}
  if(!w.jockeys.length){let index=0;for(const country of Object.keys(COUNTRIES))for(let n=0;n<64;n++)w.jockeys.push({id:`jockey-initial-${index++}`,name:`${['Alex','Sam','Robin','Kai','Taylor','Morgan','Jamie'][n%7]} ${['Vale','Reed','Aoki','Hayes','Blake','Mori','Quinn','Carter','Rowan','Hill','Ward','Frost','Lake','West'][n%14]+' '+(Math.floor(n/14)+1)}`,country,age:21+n%30,start:55+(n%14)*3,pace:60+(n%14)*2,finish:50+(n%14)*3,fee:String(10000+(n%14)*5000),starts:0,wins:0});}
  for(const country of Object.keys(COUNTRIES)){const count=w.jockeys.filter(j=>j.country===country).length;for(let n=count;n<64;n++)w.jockeys.push({id:`jockey-v4-${country}-${n}`,name:`${country} circuit rider ${n+1}`,country,age:21+n%30,start:55+n%14*3,pace:60+n%14*2,finish:50+n%14*3,fee:String(10000+n%14*5000),starts:0,wins:0});}
  if(previousSchema<6&&w.fixtures.length)renewCalendar(w,w.day);
  if(previousSchema<6&&Object.keys(w.horses).length)rotateAuctions(w);
  if(ensureCalendarHorizon(w))Object.defineProperty(w,'migrationNeedsSave',{value:true,enumerable:false,configurable:true});
  if(w.fixtures.length){ensureRaceTypeCoverage(w);ensureYoungProgression(w);openGradedRaceAges(w);}
  for(const f of w.fixtures)if(f.status==='scheduled'&&f.classId!=='maiden'&&f.grade!=='Maiden'&&f.conditions?.minWins>0){f.conditions.minPlacings??=f.conditions.minWins;delete f.conditions.minWins;}
  w.schema=RULES.schema;return w;
}
