import { age } from './rules.js';
export const CLASSIC_SERIES=[
 {id:'derby-prep-1',name:'Spring Road Trial',month:2,day:20,distance:1700,classId:'g3',points:[20,10,6,4,2]},
 {id:'derby-prep-2',name:'Bluegrass Road Stakes',month:3,day:20,distance:1800,classId:'g2',points:[50,25,15,10,5]},
 {id:'derby-prep-3',name:'Final Derby Trial',month:4,day:12,distance:1800,classId:'g2',points:[100,50,25,15,10]},
 {id:'kentucky-derby',name:'Kentucky Derby',month:5,day:2,distance:2000,track:'Churchill Downs',classId:'g1',qualification:{route:'USA Derby',minPoints:20,maxRank:20}},
 {id:'preakness',name:'Preakness Stakes',month:5,day:16,distance:1900,track:'Pimlico (game default; edition overrides supported)',classId:'g1'},
 {id:'belmont',name:'Belmont Stakes',month:6,day:6,distance:2400,track:'Belmont Park (game default; edition overrides supported)',classId:'g1'},
];
export function qualifyingStandings(w,year,route='USA Derby'){const total=new Map();for(const entry of w.qualifyingPoints||[])if(entry.year===year&&entry.route===route)total.set(entry.horseId,(total.get(entry.horseId)||0)+entry.points);return [...total].map(([horseId,points])=>({horseId,points})).sort((a,b)=>b.points-a.points||a.horseId.localeCompare(b.horseId));}
export function qualificationReason(w,h,f){if(!f.qualification)return null;const year=f.year??Math.floor(f.day/360)+1,q=f.qualification,standings=qualifyingStandings(w,year,q.route),rank=standings.findIndex(x=>x.horseId===h.id),points=standings[rank]?.points||0;if(points<q.minPoints)return `${q.route}: ${points}/${q.minPoints} qualifying points this season; earn points in the published prep races.`;if(rank>=q.maxRank)return `${q.route}: outside the published top ${q.maxRank}; tied points use stable horse ID in this game.`;return null;}
export function commitQualification(w,r,f){
 w.qualifyingPoints??=[];
 if(f.qualifyingRoute)for(const row of r.rows){const points=f.qualifyingPoints[row.place-1]||0;if(row.place!=null&&points&&!w.qualifyingPoints.some(p=>p.resultId===r.id&&p.horseId===row.horseId))w.qualifyingPoints.push({resultId:r.id,horseId:row.horseId,route:f.qualifyingRoute,year:f.year,points});}
 if(!['kentucky-derby','preakness','belmont'].includes(f.majorSeriesId))return;
 const winner=r.rows.find(row=>row.place===1);if(!winner)return;
 const legs=['kentucky-derby','preakness','belmont'].map(series=>w.fixtures.find(x=>x.majorSeriesId===series&&x.year===f.year&&x.resultId&&w.results[x.resultId]?.rows.some(row=>row.horseId===winner.horseId&&row.place===1)));
 if(legs.every(Boolean)&&!w.awards.some(a=>a.category==='Triple Crown'&&a.year===f.year&&a.horseId===winner.horseId))w.awards.push({id:`triple-crown-${f.year}-${winner.horseId}`,horseId:winner.horseId,category:'Triple Crown',day:w.day,year:f.year,version:1,evidence:legs.map(x=>x.resultId)});
}
