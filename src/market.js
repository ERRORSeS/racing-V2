import { validateCareerTimeline } from './career-timeline.js';
import { childrenOf } from './family-index.js';
import { appraisal } from './valuation.js';
import { attachAuction } from './auction-catalog.js';
import { scratchEntries } from './care.js';
import { age, cents } from './rules.js';
import { id, random, integer } from './random.js';
import { transact, event, ownedHorse } from './core.js';
import { career } from './career.js';
export { appraisal } from './valuation.js';
export function saleBlocker(w,h){
 if(!h||h.status==='deceased')return 'This horse is no longer available for sale.';
 if(h.youngstock?.weaning.stage!=='complete'||h.sex==='filly'&&childrenOf(w,h.id).some(x=>x.dam===h.id&&x.youngstock?.weaning.stage!=='complete'&&x.owner===h.owner))return 'Complete gradual weaning before an individual sale; dependent mare–foal pairs cannot be separated.';
 return null;
}
export const bidIncrement=()=>100000n;
export function nextBid(l){return BigInt(l.bids.at(-1)?.amount||'0')+bidIncrement();}
export function outstandingBids(w,exceptId=null){return w.listings.filter(l=>l.id!==exceptId&&l.kind==='auction'&&!l.closed&&!l.sold&&l.bids.at(-1)?.owner==='player').reduce((sum,l)=>sum+BigInt(l.bids.at(-1).amount),0n);}
export function transfer(w,l,buyer,price) {
  if(l.sold||l.closed)throw Error('Listing is already sold or closed.');const h=w.horses[l.horseId],seller=h.owner;
  const blocker=saleBlocker(w,h);if(blocker)throw Error(blocker);if(!w.owners[buyer]||buyer==='archive'||!/^\d+$/.test(String(price))||BigInt(price)<=0n)throw Error('Invalid buyer or sale price.');
  if(seller!==l.seller)throw Error('Seller no longer owns this horse.');if(buyer===seller)throw Error('Cannot buy your own listing.');
  if(buyer==='player')transact(w,-BigInt(price),'Bloodstock purchase',l.id);else {const o=w.owners[buyer];if(!o||BigInt(o.balance)<BigInt(price))throw Error('Buyer budget is insufficient.');o.balance=(BigInt(o.balance)-BigInt(price)).toString();}
  if(seller==='player')transact(w,BigInt(price),'Bloodstock sale',l.id);else w.owners[seller].balance=(BigInt(w.owners[seller].balance||'0')+BigInt(price)).toString();
  scratchEntries(w,h,'ownership transfer');h.owner=buyer;l.sold=true;l.buyer=buyer;l.salePrice=String(price);l.saleDay=w.day;l.status='sold';l.closed=true;h.ownership.push({owner:buyer,day:w.day,price:String(price),seller});
  event(w,'ownership',`${h.name} sold by ${w.owners[seller].name} to ${w.owners[buyer].name} for ${(BigInt(price)/100n).toString()} USD.`,h.id);
}
export function buy(w,listingId) {
  const l=w.listings.find(x=>x.id===listingId);if(!l||l.sold||l.closed||l.kind==='auction')throw Error('Private listing unavailable.');transfer(w,l,'player',l.price);
}
export function listHorse(w,horseId,value,kind='private') {
  const h=ownedHorse(w,horseId);validateCareerTimeline(w,h);const blocker=saleBlocker(w,h);if(blocker)throw Error(blocker);if(w.listings.some(l=>l.horseId===h.id&&!l.sold&&!l.closed))throw Error('Horse is already listed.');if(w.fixtures.some(f=>f.status==='scheduled'&&f.entries?.some(e=>e.horseId===h.id)))throw Error('Scratch race entries before listing.');
  const price=cents(value);if(BigInt(price)<=0n)throw Error('Price must be greater than zero.');if(!['private','auction'].includes(kind))throw Error('Choose private sale or auction.');
  const l={id:id(w,'listing'),horseId:h.id,seller:h.owner,price,reserve:price,kind,sold:false,closed:false,day:w.day,endDay:w.day+7,bids:[],disclosure:h.medicalCase?`Active ${w.medical.find(m=>m.id===h.medicalCase)?.diagnosis}; ${h.clearance}`:`${h.clearance}; soundness ${h.soundness.toFixed(1)}`};w.listings.push(l);attachAuction(w,l);event(w,'market',`${h.name} listed for ${kind} sale with medical disclosures.`,h.id);return l;
}
export function bid(w,listingId,value) {
  const l=w.listings.find(x=>x.id===listingId);if(!l||l.kind!=='auction'||l.sold||l.closed||l.endDay<=w.day)throw Error('Auction is closed.');if(l.seller==='player')throw Error('You cannot bid on your own horse.');
  const h=w.horses[l.horseId],blocker=saleBlocker(w,h);if(blocker)throw Error(blocker);if(h.owner!==l.seller)throw Error('Seller no longer owns this horse.');
  const amount=cents(value),last=l.bids.at(-1);if(last?.owner==='player')throw Error('You are already the highest bidder.');if(BigInt(amount)<nextBid(l))throw Error('Bid must meet the displayed next bid (minimum $1,000 increment).');if(!w.unlimited&&BigInt(amount)+outstandingBids(w,l.id)>BigInt(w.balance))throw Error('Bid and other leading auction commitments exceed current funds.');l.bids.push({owner:'player',amount,day:w.day});event(w,'market',`Bid recorded on ${w.horses[l.horseId].name}.`,l.horseId);
}
export function withdrawListing(w,listingId){const l=w.listings.find(x=>x.id===listingId);if(!l||l.seller!=='player'||l.sold||l.closed)throw Error('No active owned listing.');if(l.bids.length)throw Error('An auction with bids cannot be withdrawn.');l.closed=true;l.status='withdrawn';}
export function marketDay(w) {
  for(const l of w.listings){if(l.sold||l.closed||l.lastMarketDay===w.day)continue;l.lastMarketDay=w.day;const h=w.horses[l.horseId],blocker=saleBlocker(w,h);if(blocker||h.owner!==l.seller){l.closed=true;l.status='withdrawn';l.closeReason=blocker||'Seller no longer owns the horse.';event(w,'market',`Listing ${l.id} withdrawn: ${l.closeReason}`,h.id);continue;}const value=BigInt(appraisal(w,h));
    if(l.kind==='auction'){
      if(w.day<l.endDay&&l.lastNpcBidDay!==w.day&&random(w)<.3){l.lastNpcBidDay=w.day;const candidates=Object.entries(w.owners).filter(([key,o])=>!['player','archive',l.seller,l.bids.at(-1)?.owner].includes(key)&&BigInt(o.balance||'0')>BigInt(l.bids.at(-1)?.amount||'0'));const pair=candidates[integer(w,0,Math.max(0,candidates.length-1))];if(pair){const minimum=BigInt(l.bids.at(-1)?.amount||'0')+BigInt(integer(w,100000,1000000)),reserve=BigInt(l.reserve),offer=minimum<reserve&&reserve<=value*12n/10n?reserve:minimum;if(offer<value*14n/10n&&offer<BigInt(pair[1].balance))l.bids.push({owner:pair[0],amount:offer.toString(),day:w.day});}}
      if(w.day>=l.endDay){const top=l.bids.at(-1);
       if(!top||BigInt(top.amount)<BigInt(l.reserve)){l.status='passed_in';l.closeReason=top?'Reserve not met.':'No bids received.';}
       else try{transfer(w,l,top.owner,top.amount);}catch(error){l.status='settlement_failed';l.closeReason=error.message;event(w,'market',`Auction ${l.id} failed settlement: ${error.message} No ownership transfer.`,h.id);}
       l.closed=true;
      }
    }else if(l.seller==='player'&&random(w)<.02&&BigInt(l.price)<=value*12n/10n){const buyer=Object.entries(w.owners).find(([key,o])=>!['player','archive'].includes(key)&&BigInt(o.balance||'0')>=BigInt(l.price));if(buyer)try{transfer(w,l,buyer[0],l.price);}catch(error){l.closeReason=error.message;}}
  }
}

export function prePurchase(w,horseId){const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('Choose a live sale horse.');transact(w,-15000n,'Pre-purchase veterinary exam',horseId);const m=w.medical.find(m=>m.id===h.medicalCase);const report=m?`Known ${m.diagnosis}, ${m.severity}; ${h.clearance}. No guarantee of future soundness.`:`No active diagnosed case. Soundness ${h.soundness.toFixed(1)}, hoof health ${h.hoofHealth.toFixed(1)}. This examination cannot guarantee future performance or detect every latent issue.`;w.visits.push({id:id(w,'visit'),horseId,day:w.day,type:'PPE',owner:'player',report});event(w,'medical',`Pre-purchase examination: ${report}`,horseId);return report;}
