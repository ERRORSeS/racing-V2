import {clamp} from './rules.js';
export const TRAINING_INTENSITIES=['Rest','Light','Balanced','Intense'];
// One authoritative acute-fatigue value; workload is a separate rolling log.
export function changeFatigue(w,h,{load=0,recovery=0,source='Work'}={}){
 const before=h.fatigue,after=clamp(before+Math.max(0,load)-Math.max(0,recovery));
 h.fatigue=after<.5?0:after;
 if(h.owner==='archive')return;
 h.fatigueLog??=[];h.fatigueLog=h.fatigueLog.filter(d=>d.day>w.day-28);
 let day=h.fatigueLog.at(-1);if(day?.day!==w.day){day={day:w.day,load:0,recovery:0,sources:[]};h.fatigueLog.push(day);}
 day.load+=Math.max(0,load);day.recovery+=Math.min(before+load,Math.max(0,recovery));day.end=h.fatigue;
 if(!day.sources.includes(source))day.sources.push(source);
 h.workloadLoad7d=h.fatigueLog.filter(d=>d.day>w.day-7).reduce((n,d)=>n+d.load,0);
 h.workloadLoad28d=h.fatigueLog.reduce((n,d)=>n+d.load,0);
}
export function fatigueSummary(w,h){const days=(h.fatigueLog||[]).filter(d=>d.day>w.day-7),latest=days.at(-1);return {load:days.reduce((n,d)=>n+d.load,0),recovery:days.reduce((n,d)=>n+d.recovery,0),latest,trend:latest?latest.load>latest.recovery?'increasing':latest.load<latest.recovery?'decreasing':'steady':'unrecorded'};}
