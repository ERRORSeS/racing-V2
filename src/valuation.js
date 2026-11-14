import {age,clamp} from './rules.js';
import {career} from './career.js';
import {careerWindow} from './durability.js';
import {childrenOf} from './family-index.js';
const CLASS_WEIGHT={trial:0,maiden:.18,novice:.24,claiming:.22,allowance:.3,handicap:.38,open:.5,listed:.65,g3:.9,g2:1.15,g1:1.5};
export function legacyAppraisal(w,h,{careerValue=true}={}){
 const c=career(h),structure=Object.values(h.conformation).reduce((a,b)=>a+b,0)/Object.keys(h.conformation).length;
 const dollars=5000+Math.pow((h.skills.speed+h.skills.stamina)/2,2)*18+Math.pow(structure,3)*80+(careerValue?c.wins*120000+Number(BigInt(c.earnings)/100n)*1.5:0);
 const award=h.inspection?.grade==='Elite'?1.3:h.inspection?.grade==='Golden'?1.15:1;
 return String(Math.round(Math.min(100000000,dollars)*100*(h.soundness/100)*award*(age(h,w.day)>15?.6:1)));
}
export function appraisal(w,h){return h.marketAppraisal?.currentValue||legacyAppraisal(w,h);}
export function raceMarketEvidence(w,h,s){
 const r=w.results[s.resultId],row=r?.rows.find(row=>row.horseId===h.id);if(!row)return null;
 const size=r.rows.length,fieldSizeFactor=Math.pow(clamp((size-1)/9,.12,1.4),1.3),fieldStrength=clamp(r.rows.reduce((n,row)=>n+((row.effectiveSkills?.speed??50)+(row.effectiveSkills?.stamina??50))/2,0)/Math.max(1,size)/65,.5,1.4);
 const position=row.place,finish=position===1?1:position===2?.8:position===3?.66:position===4?.4:position==null?-.35:Math.max(-.35,.18-(position-5)*.06),weight=CLASS_WEIGHT[s.classId]||.2;
 const rating=Number.isFinite(s.performanceRating)?s.performanceRating:50,margin=row.margin??0,context=clamp(1+(rating-75)/500-Math.min(30,Math.max(0,margin))*.003+((row.carriedWeight||56)-56)*.004,.7,1.2);
 return {resultId:r.id,day:r.day,position,fieldSize:size,classId:s.classId,classWeight:weight,fieldStrength,fieldSizeFactor,performanceRating:rating,quality:weight*fieldStrength*fieldSizeFactor*finish*context,podium:position!=null&&position<=3,finished:position!=null,description:`${position==null?'Pulled up':`${position} of ${size}`} · ${r.grade||s.classId} · ${r.title}`};
}
export function estimateConsistency(evidence){
 const n=evidence.length,top3=evidence.filter(e=>e.podium).length,confidence=n/(n+4),top3Rate=n?top3/n:0,ratings=evidence.filter(e=>e.finished).map(e=>e.performanceRating),mean=ratings.reduce((a,b)=>a+b,0)/Math.max(1,ratings.length),deviation=Math.sqrt(ratings.reduce((n,r)=>n+(r-mean)**2,0)/Math.max(1,ratings.length));
 const stability=clamp(1-deviation/35,0,1),index=confidence*(top3Rate*.7+stability*.3);
 return {starts:n,top3,top3Rate,confidence,index,ratingDeviation:deviation};
}
const performanceCache=new WeakMap();
function performanceFacts(w,h){
 const cached=performanceCache.get(h);if(cached?.starts===h.starts&&cached.length===h.starts.length)return cached;
 const evidence=h.starts.slice(-10).map(s=>raceMarketEvidence(w,h,s)).filter(Boolean),consistency=estimateConsistency(evidence),weights=evidence.map((_,i)=>Math.pow(.85,evidence.length-i-1)),quality=Math.max(0,evidence.reduce((n,e,i)=>n+e.quality*weights[i],0)/Math.max(.001,weights.reduce((a,b)=>a+b,0)));
 const graded=h.starts.filter(s=>s.place!=null&&s.place<=3&&['g1','g2','g3'].includes(s.classId)).map(s=>raceMarketEvidence(w,h,s)).filter(e=>e&&e.fieldSize>=4&&e.fieldStrength>=.7).sort((a,b)=>b.quality-a.quality).slice(0,10),merit=graded.reduce((n,e)=>n+Math.max(0,e.quality),0),meritConfidence=graded.length/(graded.length+3);
 const facts={starts:h.starts,length:h.starts.length,evidence,consistency,quality,merit,meritConfidence};performanceCache.set(h,facts);return facts;
}
export function marketComponents(w,h){
 const {evidence,consistency,quality,merit,meritConfidence}=performanceFacts(w,h);
 const window=careerWindow(h,w.day),future=h.status!=='active'?0:window.remainingDays==null?1:clamp(window.remainingDays/1080,0,1),clinical=h.medicalCase?.45:clamp((h.potentialSoundnessCeiling??100)/100,.35,1);
 const children=childrenOf(w,h.id),proven=children.filter(c=>c.starts.some(s=>{if(s.place!==1||s.classId!=='g1')return false;const e=raceMarketEvidence(w,c,s);return e&&e.fieldSize>=6&&e.fieldStrength>=.7;})).length;
 const breeding=h.status!=='deceased'&&h.sex!=='gelding'&&age(h,w.day)>=3?Math.min(5000000,Math.sqrt(merit)*450000*meritConfidence+Math.sqrt(proven)*900000):0;
 const intrinsic=Number(BigInt(legacyAppraisal(w,h,{careerValue:false}))/100n),racing=2000000*Math.pow(quality,1.4)*consistency.confidence*(.65+consistency.index*.7)*future*clinical;
 const segment=age(h,w.day)<2?'youngstock':h.status==='retired'?(h.sex==='gelding'?'retired gelding':'breeding stock'):'racing';
 const cap={youngstock:5000000,'retired gelding':3000000,'breeding stock':40000000,racing:h.sex==='gelding'?15000000:25000000}[segment];
 return {evidence,consistency,quality,future,clinical,breedingPremium:breeding,segment,rawTarget:Math.max(1000,Math.min(cap,intrinsic+racing+breeding)),ceiling:cap};
}
export function initializeAppraisal(w,h,{fresh=false}={}){
 if(h.marketAppraisal?.version===7&&!fresh)return h.marketAppraisal;
 const previous=fresh?legacyAppraisal(w,h):h.marketAppraisal?.currentValue||h.appraisedValue||legacyAppraisal(w,h),c=marketComponents(w,h),value=/^\d+$/.test(String(previous))&&BigInt(previous)>0n?String(previous):String(Math.max(100000,Number(legacyAppraisal(w,h))));
 if(fresh)h.valuationHistory=[];h.valuationHistory??=[];h.marketAppraisal={version:7,currentValue:value,previousValue:value,anchorValue:value,calibration:Number(BigInt(value)/100n)/Math.max(1,c.rawTarget),lastDay:w.day,lastResultId:null,lastChange:'0',lastRaceChange:'0',reason:'V7 anchor: existing market price preserved; historical paid prices unchanged.',processedResultIds:h.starts.map(s=>s.resultId),processedMaterialKeys:[],consistency:c.consistency,quality:c.quality,segment:c.segment,lastClinicalKey:clinicalKey(h)};
 return h.marketAppraisal;
}
function targetValue(w,h){const c=marketComponents(w,h),p=h.marketAppraisal;return {components:c,value:Math.max(Math.min(100000,Number(p.anchorValue)),Math.round(Math.min(Math.max(c.ceiling,Number(BigInt(p.anchorValue)/100n)*1.3),c.rawTarget*p.calibration)*100))};}
function commitValue(w,h,{value,reason,resultId=null,key,type='Race performance',components}){
 const p=h.marketAppraisal,previous=p.currentValue,next=String(Math.max(Math.min(100000,Number(p.anchorValue)),Math.round(value))),change=(BigInt(next)-BigInt(previous)).toString();
 p.previousValue=previous;p.currentValue=next;p.lastChange=change;p.lastDay=w.day;p.reason=reason;p.lastResultId=resultId;if(resultId)p.lastRaceChange=change;p.consistency=components.consistency;p.quality=components.quality;p.segment=components.segment;
 h.valuationHistory.push({id:`valuation-${h.id}-${h.valuationHistory.length+1}`,day:w.day,eventType:'ValuationChanged',type,key,resultId,previousValue:previous,value:next,change,reason,quality:components.quality,consistency:components.consistency.index});
 return h.valuationHistory.at(-1);
}
export function recordVerifiedStart(w,h,start){
 const p=initializeAppraisal(w,h);if(p.processedResultIds.includes(start.resultId))return null;const evidence=raceMarketEvidence(w,h,start);if(!evidence)return null;
 const {value,components}=targetValue(w,h),current=Number(p.currentValue),firstG1=start.classId==='g1'&&start.place===1&&!h.starts.some(s=>s.resultId!==start.resultId&&s.classId==='g1'&&s.place===1),max=firstG1?(evidence.quality>=.8&&components.consistency.confidence>=.4?.5:.25):start.classId==='g1'&&start.place===1&&evidence.quality>=.8?.35:evidence.podium&&evidence.classWeight>=.65?.12:evidence.podium?.04:.03;
 const step=clamp((value/current-1)*.22,h.pendingRaceClinicalValuation?-.3:-.08,max),reason=`${evidence.description}; top-three ${components.consistency.top3}/${components.consistency.starts}, evidence confidence ${(components.consistency.confidence*100).toFixed(0)}%; class/field-adjusted form${components.future<.7?'; approaching career-window end':''}${h.medicalCase?'; veterinary restriction':''}.`;
 p.processedResultIds.push(start.resultId);p.lastClinicalKey=clinicalKey(h);delete h.pendingRaceClinicalValuation;return commitValue(w,h,{value:current*(1+step),reason,resultId:start.resultId,key:start.resultId,components});
}
export function clinicalKey(h){return `${h.status}:${h.medicalCase||''}:${h.clearance}:${h.brood?'breeding':''}`;}
export function recordMaterialValue(w,h,type,key){
 const p=initializeAppraisal(w,h);if(p.processedMaterialKeys.includes(key))return null;const {value,components}=targetValue(w,h),current=Number(p.currentValue),step=clamp((value/current-1)*.4,-.3,.2);p.processedMaterialKeys.push(key);
 return commitValue(w,h,{value:current*(1+step),reason:`${type}: clinical outlook, remaining career window and proven breeding demand reconciled; historical achievements retained.`,key,type,components});
}
export function refreshMaterialValue(w,h){const p=initializeAppraisal(w,h),key=clinicalKey(h);if(key!==p.lastClinicalKey){p.lastClinicalKey=key;return recordMaterialValue(w,h,'Health / retirement update',`clinical:${w.day}:${key}`);}return null;}
export function recordSaleEvidence(w,h,l){
 const p=initializeAppraisal(w,h),key=`sale:${l.id}`;if(p.processedMaterialKeys.includes(key))return null;
 p.salesEvidence??=[];p.salesEvidence.push({listingId:l.id,day:l.saleDay,price:l.salePrice,buyer:l.buyer,seller:l.seller});
 // A paid price is evidence, not a new price formula or free cash. Limit its
 // influence so one unlimited-money overpayment cannot rebase the market.
 const ratio=clamp(Math.sqrt(Number(l.salePrice)/Math.max(1,Number(p.currentValue))),.85,1.15);p.calibration*=1+(ratio-1)*.2;
 return recordMaterialValue(w,h,'Verified paid sale evidence',key);
}
