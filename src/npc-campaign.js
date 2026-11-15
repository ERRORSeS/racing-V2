import {seed} from './random.js';
import {age,clamp} from './rules.js';
import {racingWindowReason} from './durability.js';
const campaignDraws=new WeakMap();
function draw(w,h,key){let cached=campaignDraws.get(h);if(!cached||cached.seed!==w.seed||cached.id!==h.id){cached={seed:w.seed,id:h.id,values:new Map()};campaignDraws.set(h,cached);}if(!cached.values.has(key))cached.values.set(key,seed(`${w.seed}:${h.id}:campaign:${key}`)/4294967296);return cached.values.get(key);}
export const CAMPAIGN_STATES=['Unstarted','Initial training','Conditioning','Trialing or qualifying','Active racing campaign','Post-race recovery','Freshening break','Veterinary break','Rehabilitation','Retired from racing'];
export function raceSpacing(w,h,distance=h.distance){
 const recovery=h.skills.recovery??50,strain=(h.racingDurability?.cumulativeRacingStrain||0)+(h.racingDurability?.preRacingStrain||0);
 return Math.round(clamp(21+draw(w,h,'spacing')*12+(distance-1600)/220+(age(h,w.day)===2?5:0)+(70-recovery)/8+(100-h.soundness||0)/4+Math.max(0,(h.starts.at(-1)?.tier||0)-4)+Math.min(7,strain/20),14,42));
}
export function npcCampaign(w,h){
 const year=Math.floor(w.day/360),p=h.npcCampaign??={version:9,debutDay:h.starts[0]?.day??null,careerStarts:h.starts.length,annualYear:year,annualStarts:0,targetStarts:0,nextEligibleDay:w.day,plannedTargets:[],state:'Unstarted',stateHistory:[],individualRecovery:h.skills.recovery??50};
 if(p.annualYear!==year||p.countedStarts!==h.starts.length||!p.targetStarts){
  p.annualYear=year;p.annualStarts=h.starts.filter(s=>Math.floor(s.day/360)===year).length;p.careerStarts=h.starts.length;p.countedStarts=h.starts.length;
  const a=age(h,w.day),n=draw(w,h,`target:${year}`);p.targetStarts=a===2?(h.precociousRecruit?5:n<.08?0:n>.96?5:1+Math.floor(n*3)):a===3?3+Math.floor(n*4):4+Math.floor(n*4);
  p.debutDay=h.starts[0]?.day??null;
 }
 p.lastRaceDay=h.lastRaceDay??null;p.nextEligibleDay=h.lastRaceDay==null?w.day:h.lastRaceDay+raceSpacing(w,h,h.starts.at(-1)?.distance);
 return p;
}
export function npcRaceReason(w,h,f){
 if(f.historical||['player','archive'].includes(h.owner))return null;
 const p=npcCampaign(w,h),a=age(h,f.day),year=Math.floor(f.day/360),starts=year===p.annualYear?p.annualStarts:h.starts.filter(s=>Math.floor(s.day/360)===year).length;
 if(f.day<p.nextEligibleDay)return `NPC post-race recovery until day ${p.nextEligibleDay}.`;
 const target=year===p.annualYear?p.targetStarts:(a===2?2:a===3?5:6);
 if(a===2&&starts>=5)return 'Juvenile annual campaign complete.';
 if(starts>=target){const exceptional=draw(w,h,`extra:${year}`)>.9;if(!exceptional||starts>=target+1||f.day-(h.lastRaceDay??f.day)<90)return 'NPC freshening break / annual campaign complete.';}
 if((h.reliability?.currentForm||0)<-.025&&f.day-w.day<14)return 'NPC trainer is freshening after poor form.';
 if(h.breakPlan&&h.breakPlan.stage!=='Complete')return 'NPC planned rest.';
 if((f.tier||0)>=5&&(h.skills.speed<((f.tier||0)>=7?75:(f.tier||0)>=6?70:65)||h.fitness<65||h.starts.length<3))return 'NPC trainer seeks a lower racing level.';
 if((f.tier||0)<4&&h.starts.some(s=>s.place<=3&&s.tier>=5))return 'NPC trainer is targeting stakes company.';
 if(Math.abs(h.distance-f.distance)>Math.max(600,h.distance*.35))return 'NPC trainer seeks a suitable distance.';
 return null;
}
export function campaignDay(w,h){
 if(['player','archive'].includes(h.owner))return;
 const p=npcCampaign(w,h),starting=h.youngstock?.starting;
 let state=h.status!=='active'||racingWindowReason(w,h,w.day)?'Retired from racing':h.therapy?.status==='active'?'Rehabilitation':h.medicalCase?(h.clearance==='Rehab'||h.clearance==='Controlled Light Work'?'Rehabilitation':'Veterinary break'):w.day-h.born<360?'Unstarted':starting?.status!=='complete'?'Initial training':h.fitness<60?'Conditioning':h.lastRaceDay!=null&&w.day<p.nextEligibleDay?'Post-race recovery':p.annualStarts>=p.targetStarts?'Freshening break':!h.starts.length?'Trialing or qualifying':'Active racing campaign';
 if(state!==p.state){p.state=state;p.stateHistory.push({day:w.day,state});p.stateHistory=p.stateHistory.slice(-24);}
 p.plannedTargets=p.plannedTargets.filter(t=>t.day>=w.day);
}
export function planCampaignTarget(w,h,f){const p=npcCampaign(w,h);if(!p.plannedTargets.some(t=>t.fixtureId===f.id))p.plannedTargets.push({fixtureId:f.id,day:f.day,country:f.country,distance:f.distance,tier:f.tier});}

export function initializeV9World(w){
 if(w.v9Version===9)return false;
 w.settings.namingPreset??='Long OXO';for(const h of Object.values(w.horses))if(!['player','archive'].includes(h.owner))npcCampaign(w,h);
 w.v9Version=9;return true;
}
