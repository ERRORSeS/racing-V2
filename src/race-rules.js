import { COUNTRIES } from './rules.js';
export const RACE_CLASSES = Object.freeze([
  {id:'trial',label:'Trial',tier:0,type:'trial',purse:'0',sanctioned:false},
  {id:'maiden',label:'Maiden',tier:1,type:'maiden',purse:'3000000',maxWins:0},
  {id:'novice',label:'Novice',tier:2,type:'novice',purse:'5000000',maxWins:2},
  {id:'claiming',label:'Claiming',tier:2,type:'claiming',purse:'3500000',claimPrice:'2500000'},
  {id:'allowance',label:'Allowance',tier:2,type:'allowance',purse:'7500000'},
  {id:'handicap',label:'Handicap',tier:3,type:'handicap',purse:'9000000',minRating:35,maxRating:100},
  {id:'open',label:'Open Stakes',tier:4,type:'stakes',purse:'15000000'},
  {id:'listed',label:'Listed',tier:4,type:'stakes',purse:'25000000',blackType:true},
  {id:'g3',label:'3',tier:5,type:'stakes',purse:'40000000',blackType:true},
  {id:'g2',label:'2',tier:6,type:'stakes',purse:'75000000',blackType:true},
  {id:'g1',label:'1',tier:7,type:'stakes',purse:'150000000',blackType:true},
]);
export function classDefinition(f){return RACE_CLASSES.find(c=>c.id===f.classId)||RACE_CLASSES.find(c=>classLabel(c,f.country)===f.grade)||RACE_CLASSES.find(c=>c.id==='open');}
export function classLabel(c,country){return c.id.startsWith('g')?`${COUNTRIES[country].grade} ${c.label}`:c.id==='allowance'&&['UK','Ireland','France'].includes(country)?'Conditions':c.label;}
export function conditionsFor(c,index=0){return {minAge:2,maxAge:12,sex:index%9===5?'filly':'open',maxWins:c.maxWins??null,minRating:c.minRating??null,maxRating:c.maxRating??null,minWins:null,bredIn:null};}
export function observedRating(h){const starts=h.starts.filter(s=>s.performanceRating!=null).slice(-5);return starts.length>=3?Math.round(starts.reduce((n,s)=>n+s.performanceRating,0)/starts.length):null;}
export function carriedWeight(h,f){const rating=observedRating(h);return Math.max(50,Math.min(63,f.raceType==='handicap'?53+((rating??65)-50)/10:56+(h.sex==='filly'?-1.5:0)));}
export const FIELD_DENSITY={Sparse:{activePerStable:6,target:6},Balanced:{activePerStable:10,target:8},Busy:{activePerStable:16,target:12}};
