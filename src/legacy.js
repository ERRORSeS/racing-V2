import { id } from './random.js';
import { career } from './career.js';
export function evaluateLegacy(w,h){
 const starts=h.starts.filter(s=>s.place!=null),g1=starts.filter(s=>s.place===1&&(s.classId==='g1'||/ (?:1)$/.test(s.grade||''))),g2=starts.filter(s=>s.place===1&&s.classId==='g2'),g3=starts.filter(s=>s.place===1&&s.classId==='g3'),listed=starts.filter(s=>s.place===1&&s.classId==='listed');
 const score=g1.length*25+g2.length*12+g3.length*6+listed.length*3;
 h.legacyScore=score;h.legacyAwards??=[];
 if(g1.length>=4&&score>=100&&!w.awards.some(a=>a.horseId===h.id&&a.category==='Legendary Racer')){const award={id:id(w,'award'),horseId:h.id,category:'Legendary Racer',day:w.day,version:1,score,evidence:g1.map(s=>s.resultId)};h.legacyAwards.push(award.id);w.awards.push(award);}
 const children=Object.values(w.horses).filter(c=>c.sire===h.id||c.dam===h.id),winners=children.filter(c=>c.starts.some(s=>s.place===1&&s.classId==='g1'));
 const category=h.sex==='colt'?'Legendary Sire':'Legendary Broodmare';
 if(winners.length>=3&&new Set(winners.map(c=>Math.floor(c.born/360))).size>=2&&!w.awards.some(a=>a.horseId===h.id&&a.category===category)){const award={id:id(w,'award'),horseId:h.id,category,day:w.day,version:1,score:winners.length*30,evidence:winners.flatMap(c=>c.starts.filter(s=>s.classId==='g1'&&s.place===1).map(s=>s.resultId))};h.legacyAwards.push(award.id);w.awards.push(award);}
 return score;
}
export function updateRecords(w,r){if(r.founderArchive)return;for(const row of r.rows){if(row.time==null)continue;const key=`${r.track}:${r.distance}:${r.surface}:${r.going}`,previous=w.trackRecords.filter(t=>t.key===key).at(-1);if(!previous||row.time<previous.time){w.trackRecords.push({id:id(w,'record'),key,horseId:row.horseId,resultId:r.id,day:r.day,time:row.time,previousId:previous?.id||null});}evaluateLegacy(w,w.horses[row.horseId]);for(const p of [w.horses[row.horseId].sire,w.horses[row.horseId].dam])if(p)evaluateLegacy(w,w.horses[p]);}}
export function annualAwards(w){const year=Math.floor((w.day-1)/360)+1;for(const country of [...new Set(Object.values(w.horses).map(h=>h.country))]){const candidates=Object.values(w.horses).map(h=>({h,starts:h.starts.filter(s=>Math.floor(s.day/360)+1===year&&s.country===country&&s.place!=null)})).filter(x=>x.starts.length);candidates.sort((a,b)=>b.starts.reduce((n,s)=>n+(s.place===1?5:Math.max(0,4-s.place))*(1+(s.tier||0)),0)-a.starts.reduce((n,s)=>n+(s.place===1?5:Math.max(0,4-s.place))*(1+(s.tier||0)),0));const winner=candidates[0];if(winner&&!w.awards.some(a=>a.category==='Annual Race Champion'&&a.year===year&&a.country===country))w.awards.push({id:id(w,'award'),horseId:winner.h.id,category:'Annual Race Champion',day:w.day,year,country,version:1,evidence:winner.starts.map(s=>s.resultId)});}}
