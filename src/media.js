import { id } from './random.js';
export function famousHorse(w,h,day=w.day){return !!h&&(h.starts.some(s=>s.day<=day&&s.place===1&&(s.tier>=7||s.classId==='g1'))||w.awards.some(a=>a.horseId===h.id&&a.day<=day&&/Legendary|Champion|Horse of the Year/.test(a.category)));}
export function raceNewsReason(w,r){
 if(r.founderArchive)return null;
 const winner=r.rows.find(row=>row.place===1&&row.outcome!=='Pulled up');if(!winner)return null;
 if(r.tier>=5||r.classId==='listed'||/^(Grade|Group) [123]$/.test(r.grade||''))return 'Major race';
 const h=w.horses[winner.horseId],run=h?.starts.find(s=>s.resultId===r.id),rating=run?.performanceRating??null,second=r.rows.find(row=>row.place===2);
 if(second?.margin>=8&&rating>=85)return 'Exceptional winning margin';
 if(rating>=100&&h.starts.filter(s=>s.day<=r.day).length<=4)return 'Emerging talent';
 const recent=h?.starts.filter(s=>s.day<=r.day).slice(-5);if(recent?.length===5&&recent.every(s=>s.place===1))return 'Five-race winning streak';
 return null;
}
export function importantStory(w,n){
 if(n.editorialVersion===2)return n.noteworthy===true;
 if(n.resultId){const r=w.results[n.resultId];return !!r&&!!raceNewsReason(w,r);}
 // Keep earlier articles archived in the save; routine legacy headlines stay out of the feed.
 return n.significance>=7;
}
export function publishRace(w,r){
 if(w.news.some(n=>n.resultId===r.id))return;const reason=raceNewsReason(w,r),winner=r.rows.find(row=>row.place===1);if(!reason||!winner)return;
 w.news.push({id:id(w,'news'),day:r.day,category:reason==='Major race'?'Major Racing':'Extraordinary',country:r.country,outlet:'First Light Racing Chronicle',headline:`${winner.name} wins ${r.title}`,summary:`${reason}: ${r.distance}m ${r.surface} at ${r.track}; ${winner.time.toFixed(2)} seconds. Prize ${(BigInt(winner.prize)/100n).toString()} USD.`,body:`Confirmed ${r.grade||'race'} result: ${r.rows.map(row=>`${row.place??'PU'}. ${row.name}${row.outcome==='Pulled up'?' (pulled up)':''}`).join('; ')}. ${reason==='Emerging talent'?'An outstanding early performance, not a guarantee of future ability. ':''}Reporting is based on the settled game result.`,horseIds:r.rows.map(row=>row.horseId),resultId:r.id,sourceEventIds:[r.id],significance:Math.max(7,r.tier||0),editorialVersion:2,noteworthy:true,read:false,bookmarked:false});
}
export function publishEvent(w,e){
 w.news??=[];let category=null,headline=e.text,related=[];
 const h=w.horses[e.horseId];
 if(e.type==='valuation'&&h){const value=h.valuationHistory?.at(-1);if(value?.resultId&&w.results[value.resultId]?.classId==='g1'){category='Market';headline=e.text;}}
 if(e.type==='birth'&&h){const parents=[w.horses[h.sire],w.horses[h.dam]].filter(p=>famousHorse(w,p,e.day));if(parents.length){category='Famous Bloodlines';related=parents.map(p=>p.id);headline=`${h.name} born from the family of ${parents.map(p=>p.name).join(' and ')}`;}}
 if(e.type==='ownership'&&h){const sale=w.listings?.find(l=>l.horseId===h.id&&l.sold&&l.saleDay===e.day);if(sale&&BigInt(sale.salePrice)>=100000000n)category='Exceptional Sale';}
 if(e.type==='life'&&(famousHorse(w,h,e.day)||e.text.includes('serious medical complication')))category='Famous Horses';
 const valuation=e.type==='valuation'?h?.valuationHistory?.at(-1):null,newsId=valuation?`news-valuation-${valuation.resultId}-${h.id}`:`news-${e.id}`;
 if(!category||w.news.some(n=>n.id===newsId))return;
 w.news.push({id:newsId,day:e.day,category,country:h?.location||w.country,outlet:'Stable & Bloodline Gazette',headline,summary:e.text,body:e.text+(e.type==='birth'?' A notable pedigree is not an earned racing title for the newborn.':''),horseIds:[e.horseId,...related].filter(Boolean),resultId:valuation?.resultId||null,sourceEventIds:[valuation?.id||e.id],significance:7,editorialVersion:2,noteworthy:true,read:false,bookmarked:false});
}
// Quiet months need no filler digest. The journal and race archive retain all routine events.
export function monthlyDigest(w){}
export function markNews(w,newsId,action){const n=w.news.find(n=>n.id===newsId);if(!n)throw Error('Article not found.');if(action==='bookmark')n.bookmarked=!n.bookmarked;else n.read=true;}
export function respondToPress(w,storyId,tone){
 const story=w.news.find(n=>n.id===storyId),r=story?.resultId&&w.results[story.resultId];
 if(!r||r.historical||r.rows.find(row=>row.place===1)?.owner!=='player'||!raceNewsReason(w,r))throw Error('This article has no post-race interview request for your stable.');
 if(!['Credit the team','Focus on the horse','Cautious campaign plans','Decline'].includes(tone))throw Error('Choose a valid press response.');
 w.pressResponses??=[];if(w.pressResponses.some(x=>x.storyId===storyId))throw Error('Interview already answered.');
 w.pressResponses.push({storyId,resultId:r.id,horseId:r.rows.find(row=>row.place===1).horseId,day:w.day,tone});if(tone!=='Decline')w.owners.player.reputation=Math.min(100,(w.owners.player.reputation||50)+.25);return w.pressResponses.at(-1);
}
