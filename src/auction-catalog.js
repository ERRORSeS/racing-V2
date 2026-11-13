import { appraisal } from './valuation.js';
import { age } from './rules.js';
import { chronologicalDays } from './youngstock.js';
import { career } from './career.js';
import { famousHorse } from './media.js';
import { seed, id } from './random.js';
export const SALE_CATEGORIES=Object.freeze({foals:'Foals / weanlings',yearlings:'Yearlings',unstarted:'Unstarted prospects',started:'Started two-year-olds',prospects:'Racing prospects',racers:'Horses of racing age',stakes:'Stakes winners / placed',champions:'Champions / legends',mare_prospects:'Broodmare prospects',broodmares:'Broodmares',stallions:'Stallions / stud prospects',retired:'Retired / second careers',rehab:'Rehabilitation',mixed:'Mixed / breeder dispersal'});
const SEASONS=[['started','prospects','racers'],['broodmares','mare_prospects','stallions'],['foals','yearlings','unstarted'],['stakes','champions','retired','rehab']];
export function saleCategories(w,h){const d=chronologicalDays(h,w.day),a=age(h,w.day),c=career(h),tags=['mixed'];if(d<360)tags.push('foals');if(d>=360&&d<720)tags.push('yearlings');if(d>=360&&h.youngstock?.starting.status!=='complete')tags.push('unstarted');if(a===2&&h.youngstock?.starting.status==='complete')tags.push('started');if(a>=2&&a<=4)tags.push('prospects');if(h.status==='active'&&d>=720)tags.push('racers');if(c.blackType)tags.push('stakes');if(famousHorse(w,h))tags.push('champions');if(h.sex==='filly'&&d>=1080)tags.push(h.brood?'broodmares':'mare_prospects');if(h.sex==='colt'&&d>=1080)tags.push('stallions');if(h.status==='retired')tags.push('retired');if(h.medicalCase||h.soundness<80)tags.push('rehab');return tags;}
export function attachAuction(w,l){
 if(l.kind!=='auction'||l.auctionEventId)return;w.auctionEvents??=[];const h=w.horses[l.horseId],month=Math.floor(l.day/30),baseId=`auction-${h.location}-${month}`;let event=w.auctionEvents.find(e=>e.id===baseId&&e.endDay>=l.endDay);
 if(!event){const eventId=w.auctionEvents.some(e=>e.id===baseId)?`${baseId}-${l.day}`:baseId;event=w.auctionEvents.find(e=>e.id===eventId);if(!event){const seasonal=SEASONS[(month+(h.location==='Australia'?6:0))%4];event={id:eventId,title:`${h.location} ${['Juvenile & Racing','Breeding Stock','Youngstock Select','Champions & Mixed'][(month+(h.location==='Australia'?6:0))%4]} Sale`,country:h.location,month,startDay:l.day,endDay:l.endDay,categories:[...seasonal,'mixed'],listingIds:[]};w.auctionEvents.push(event);}}
 l.auctionEventId=event.id;l.categories=saleCategories(w,h);if(!event.listingIds.includes(l.id))event.listingIds.push(l.id);
}
export function rotateAuctions(w){
 w.auctionGenerationLog??=[];w.auctionEvents??=[];for(const l of w.listings)attachAuction(w,l);
 const horses=Object.values(w.horses),dependentDams=new Set(horses.filter(h=>h.youngstock?.weaning.stage!=='complete').map(h=>h.dam)),unavailable=new Set(w.listings.filter(l=>!l.closed&&!l.sold||l.sold&&w.day-l.saleDay<180).map(l=>l.horseId));
 const month=Math.floor(w.day/30);if(w.auctionGenerationLog.includes(month))return;w.auctionGenerationLog.push(month);
 for(const country of [...new Set(Object.values(w.owners).map(o=>o.country))]){
  const primary=SEASONS[(month+(country==='Australia'?6:0))%4],open=w.listings.filter(l=>l.kind==='auction'&&!l.closed&&!l.sold&&w.horses[l.horseId].location===country&&Math.floor(l.day/30)===month);
  const candidates=horses.filter(h=>!['player','archive'].includes(h.owner)&&h.location===country&&h.status!=='deceased'&&h.youngstock?.weaning.stage==='complete'&&!dependentDams.has(h.id)&&!unavailable.has(h.id)&&saleCategories(w,h).some(tag=>primary.includes(tag)));
  candidates.sort((a,b)=>seed(`${w.seed}:${month}:${a.id}:consignment`)-seed(`${w.seed}:${month}:${b.id}:consignment`));
  for(const h of candidates.slice(0,Math.max(0,6-open.length))){const price=appraisal(w,h);const l={id:id(w,'listing'),horseId:h.id,seller:h.owner,price,reserve:price,kind:'auction',sold:false,closed:false,day:w.day,endDay:w.day+7,bids:[],status:'open',consignmentReason:'Monthly NPC catalog rotation'};w.listings.push(l);attachAuction(w,l);}
 }
}
