import {age,RULES} from './rules.js';

export function timelineIssue(w,h,start,fixtures=new Map(w.fixtures.map(f=>[f.id,f]))){
 const r=w.results[start.resultId],f=fixtures.get(r?.fixtureId),row=r?.rows.find(row=>row.horseId===h.id);
 if(!r||!f||!row||f.resultId!==r.id||f.status!=='completed')return 'Missing completed race evidence';
 if(!f.entries.some(e=>e.horseId===h.id&&e.owner===row.owner&&e.jockeyId===row.jockeyId)||!w.owners[row.owner])return 'Race owner or jockey disagrees with recorded nomination';
 if(start.fixtureId!==f.id||start.day!==r.day||r.day!==f.day||r.day>w.day)return 'Inconsistent race date or identity';
 if(r.day-h.born<720||age(h,r.day)<f.minAge||age(h,r.day)>f.maxAge)return 'Ineligible age at race date';
 if(f.conditions?.sex&&f.conditions.sex!=='open'&&h.sex!==f.conditions.sex)return 'Ineligible sex restriction';
 const prior=h.starts.filter(s=>s.day<r.day),wins=prior.filter(s=>s.place===1).length,conditions=f.conditions||{},maxWins=conditions.maxWins??(f.classId==='maiden'?0:null);
 if(maxWins!=null&&wins>maxWins||conditions.minWins!=null&&wins<conditions.minWins)return 'Published win restriction not met at race date';
 if(conditions.minPlacings!=null&&prior.filter(s=>s.place!=null&&s.place>=1&&s.place<=3).length<conditions.minPlacings)return 'Published top-three restriction not met at race date';
 const rated=prior.filter(s=>s.performanceRating!=null).slice(-5),rating=rated.length>=3?Math.round(rated.reduce((n,s)=>n+s.performanceRating,0)/rated.length):null;
 if(conditions.minRating!=null&&(rating==null||rating<conditions.minRating)||conditions.maxRating!=null&&rating!=null&&rating>conditions.maxRating)return 'Published rating restriction not met at race date';
 if(conditions.bredIn&&h.country!==conditions.bredIn)return 'Birth-jurisdiction restriction not met';
 if(h.retiredDay!=null&&r.day>h.retiredDay)return 'Start after permanent racing retirement';
 if(h.deceasedDay!=null&&r.day>h.deceasedDay)return 'Start after death';
 if(start.classId!==f.classId||r.classId!==f.classId||start.grade!==f.grade||r.grade!==f.grade||start.tier!==(f.tier||0))return 'Career class disagrees with race';
 if(start.place!==row.place||start.prize!==row.prize||start.time!==row.time||start.owner!==row.owner)return 'Career summary disagrees with result row';
 const prize=row.place===null?'0':(BigInt(f.purse)*BigInt(Math.round((RULES.purseShares[row.place-1]||0)*100))/100n).toString();
 if(row.prize!==prize)return 'Prize disagrees with published purse';
 if(row.readiness&&(row.readiness.status!=='complete'||row.readiness.completedDay>r.day||row.readiness.clearance!=='Race-Cleared'||row.readiness.medicalCase))return 'Race readiness or medical restriction at start';
 return null;
}
export function validateCareerTimeline(w,h,fixtures){for(const s of h.starts){const issue=timelineIssue(w,h,s,fixtures);if(issue)throw Error(`${h.name}: ${issue}.`);}return true;}

// Preserve original immutable events and identities; remove impossible claims from
// official summaries, retain a visible audit trail, and never award or claw back cash.
export function repairCareerTimelines(w){
 if(w.careerTimelineVersion===1)return false;
 const fixtures=new Map(w.fixtures.map(f=>[f.id,f]));let repaired=0;
 w.careerAudit??=[];
 for(const h of Object.values(w.horses)){
  const accepted=[],seen=new Set();
  for(const original of h.starts){
   const r=w.results[original.resultId],f=fixtures.get(r?.fixtureId),row=r?.rows.find(row=>row.horseId===h.id);
   const canonical=row&&f?{...original,resultId:r.id,fixtureId:f.id,day:r.day,title:r.title,track:r.track,country:r.country,distance:r.distance,surface:r.surface,going:r.going,grade:r.grade,classId:f.classId,tier:f.tier||0,blackType:!!f.blackType,...row}:original;
   const issue=seen.has(original.resultId)?'Duplicate career claim':timelineIssue(w,{...h,starts:accepted},canonical,fixtures);
   if(issue){h.careerQuarantine??=[];h.careerQuarantine.push({original,reason:issue,reviewDay:w.day});w.careerAudit.push({horseId:h.id,resultId:original.resultId,reason:issue,day:w.day});repaired++;continue;}
   if(JSON.stringify(original)!==JSON.stringify(canonical)){h.careerCorrections??=[];h.careerCorrections.push({original,reason:'Normalized to canonical completed result',reviewDay:w.day});repaired++;}
   accepted.push(canonical);seen.add(original.resultId);
  }
  h.starts=accepted;
  if(h.starts.length)h.lastRaceDay=h.starts.at(-1).day;
 }
 // Titles and qualifying points must retain valid official evidence for that horse.
 const official=(horseId,resultId)=>w.horses[horseId]?.starts.some(s=>s.resultId===resultId);
 w.awards=w.awards.filter(a=>a.evidence.length>0&&a.evidence.every(id=>official(a.horseId,id)||['Legendary Sire','Legendary Broodmare'].includes(a.category)&&w.results[id]?.rows.some(row=>{const child=w.horses[row.horseId];return (child.sire===a.horseId||child.dam===a.horseId)&&row.place===1&&w.results[id].classId==='g1'&&official(child.id,id);})));
 const awardIds=new Set(w.awards.map(a=>a.id));for(const h of Object.values(w.horses)){h.legacyAwards=(h.legacyAwards||[]).filter(id=>awardIds.has(id));h.legacyScore=h.starts.filter(s=>s.place===1).reduce((n,s)=>n+({g1:25,g2:12,g3:6,listed:3}[s.classId]||0),0);}
 w.qualifyingPoints=(w.qualifyingPoints||[]).filter(p=>official(p.horseId,p.resultId));
 w.trackRecords=w.trackRecords.filter(t=>!t.resultId||!t.horseId||official(t.horseId,t.resultId));
 w.careerTimelineVersion=1;w.careerTimelineReview={day:w.day,repaired,policy:'Canonical results retained; impossible claims quarantined without changing cash or identity.'};
 return true;
}
