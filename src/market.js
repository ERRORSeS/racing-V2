import { scratchEntries } from './care.js';
import { age, cents } from './rules.js';
import { id, random, integer } from './random.js';
import { transact, event, ownedHorse } from './core.js';
import { career } from './career.js';
export function appraisal(w,h) {
  const c=career(h),structure=Object.values(h.conformation).reduce((a,b)=>a+b,0)/Object.keys(h.conformation).length;
  // Market observes schooling, structure and actual results, not hidden potential.
  const dollars=5000+Math.pow((h.skills.speed+h.skills.stamina)/2,2)*18+Math.pow(structure,3)*80+c.wins*120000+Number(BigInt(c.earnings)/100n)*1.5;
  const award=h.inspection?.grade==='Elite'?1.3:h.inspection?.grade==='Golden'?1.15:1;
  return String(Math.round(Math.min(100000000,dollars)*100*(h.soundness/100)*award*(age(h,w.day)>15?.6:1)));
}
export function transfer(w,l,buyer,price) {
  if(l.sold)throw Error('Listing already sold.');const h=w.horses[l.horseId],seller=h.owner;
  if(h.youngstock?.weaning.stage!=='complete'||Object.values(w.horses).some(x=>x.dam===h.id&&x.youngstock?.weaning.stage!=='complete'&&x.owner===h.owner))throw Error('Complete gradual weaning before an individual sale; dependent mare–foal pairs cannot be separated.');
  if(seller!==l.seller)throw Error('Seller no longer owns this horse.');if(buyer===seller)throw Error('Cannot buy your own listing.');
  if(buyer==='player')transact(w,-BigInt(price),'Bloodstock purchase',l.id);else {const o=w.owners[buyer];if(!o||BigInt(o.balance)<BigInt(price))throw Error('Buyer budget is insufficient.');o.balance=(BigInt(o.balance)-BigInt(price)).toString();}
  if(seller==='player')transact(w,BigInt(price),'Bloodstock sale',l.id);else w.owners[seller].balance=(BigInt(w.owners[seller].balance||'0')+BigInt(price)).toString();
  scratchEntries(w,h,'ownership transfer');h.owner=buyer;l.sold=true;l.buyer=buyer;l.salePrice=String(price);l.saleDay=w.day;h.ownership.push({owner:buyer,day:w.day,price:String(price),seller});
  event(w,'ownership',`${h.name} sold by ${w.owners[seller].name} to ${w.owners[buyer].name} for ${(BigInt(price)/100n).toString()} USD.`,h.id);
}
export function buy(w,listingId) {
  const l=w.listings.find(x=>x.id===listingId);if(!l||l.sold||l.kind==='auction')throw Error('Private listing unavailable.');transfer(w,l,'player',l.price);
}
export function listHorse(w,horseId,value,kind='private') {
  const h=ownedHorse(w,horseId);if(h.status==='deceased')throw Error('A deceased horse cannot be sold.');if(w.listings.some(l=>l.horseId===h.id&&!l.sold&&!l.closed))throw Error('Horse is already listed.');if(w.fixtures.some(f=>f.status==='scheduled'&&f.entries?.some(e=>e.horseId===h.id)))throw Error('Scratch race entries before listing.');
  const price=cents(value);if(BigInt(price)<=0n)throw Error('Price must be greater than zero.');if(!['private','auction'].includes(kind))throw Error('Choose private sale or auction.');
  const l={id:id(w,'listing'),horseId:h.id,seller:h.owner,price,reserve:price,kind,sold:false,closed:false,day:w.day,endDay:w.day+7,bids:[],disclosure:h.medicalCase?`Active ${w.medical.find(m=>m.id===h.medicalCase)?.diagnosis}; ${h.clearance}`:`${h.clearance}; soundness ${h.soundness.toFixed(1)}`};w.listings.push(l);event(w,'market',`${h.name} listed for ${kind} sale with medical disclosures.`,h.id);return l;
}
export function bid(w,listingId,value) {
  const l=w.listings.find(x=>x.id===listingId);if(!l||l.kind!=='auction'||l.sold||l.closed||l.endDay<=w.day)throw Error('Auction is closed.');if(l.seller==='player')throw Error('You cannot bid on your own horse.');
  const amount=cents(value),last=l.bids.at(-1);if(BigInt(amount)<=BigInt(last?.amount||'0'))throw Error('Bid must exceed the current bid.');if(!w.unlimited&&BigInt(amount)>BigInt(w.balance))throw Error('Bid exceeds current balance.');l.bids.push({owner:'player',amount,day:w.day});event(w,'market',`Bid recorded on ${w.horses[l.horseId].name}.`,l.horseId);
}
export function withdrawListing(w,listingId){const l=w.listings.find(x=>x.id===listingId);if(!l||l.seller!=='player'||l.sold||l.closed)throw Error('No active owned listing.');if(l.bids.length)throw Error('An auction with bids cannot be withdrawn.');l.closed=true;}
export function marketDay(w) {
  for(const l of w.listings){if(l.sold||l.closed)continue;const h=w.horses[l.horseId],value=BigInt(appraisal(w,h));
    if(l.kind==='auction'){
      if(w.day<l.endDay&&random(w)<.3){const candidates=Object.entries(w.owners).filter(([key,o])=>!['player','archive',l.seller].includes(key)&&BigInt(o.balance||'0')>BigInt(l.bids.at(-1)?.amount||'0'));const pair=candidates[integer(w,0,Math.max(0,candidates.length-1))];if(pair){const offer=BigInt(l.bids.at(-1)?.amount||'0')+BigInt(integer(w,100000,1000000));if(offer<value*14n/10n&&offer<BigInt(pair[1].balance))l.bids.push({owner:pair[0],amount:offer.toString(),day:w.day});}}
      if(w.day>=l.endDay){const top=l.bids.at(-1);if(top&&BigInt(top.amount)>=BigInt(l.reserve)){try{transfer(w,l,top.owner,top.amount);}catch{event(w,'market',`Auction ${l.id} failed settlement; no ownership transfer.`,h.id);}}l.closed=true;}
    }else if(l.seller==='player'&&random(w)<.02&&BigInt(l.price)<=value*12n/10n){const buyer=Object.entries(w.owners).find(([key,o])=>!['player','archive'].includes(key)&&BigInt(o.balance||'0')>=BigInt(l.price));if(buyer)transfer(w,l,buyer[0],l.price);}
  }
}

export function prePurchase(w,horseId){const h=w.horses[horseId];if(!h||h.status==='deceased')throw Error('Choose a live sale horse.');transact(w,-15000n,'Pre-purchase veterinary exam',horseId);const m=w.medical.find(m=>m.id===h.medicalCase);const report=m?`Known ${m.diagnosis}, ${m.severity}; ${h.clearance}. No guarantee of future soundness.`:`No active diagnosed case. Soundness ${h.soundness.toFixed(1)}, hoof health ${h.hoofHealth.toFixed(1)}. This examination cannot guarantee future performance or detect every latent issue.`;w.visits.push({id:id(w,'visit'),horseId,day:w.day,type:'PPE',owner:'player',report});event(w,'medical',`Pre-purchase examination: ${report}`,horseId);return report;}
