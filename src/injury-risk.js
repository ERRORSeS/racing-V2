import {age,clamp,RULES} from './rules.js';
import {traitModifiers} from './traits.js';
import {initializeDurability} from './durability.js';
export function assessExposure(w,h,context,details={}){
 const p=initializeDurability(w,h),active=['training','race'].includes(context),fixture=context==='race'?w.fixtures.find(f=>f.status==='running'&&f.entries.some(e=>e.horseId===h.id)):null;
 const intensity=clamp(details.load==null?1:details.load/9,.2,2.5),raceDemand=fixture?clamp(fixture.distance/1600,.65,1.7)*(1+Math.min(12,fixture.entries.length)*.015):1;
 const load=active?(context==='race'?25*raceDemand:details.load??9):0;
 const careTrait=traitModifiers(h,{phase:'health'}).values.soundness||0;
 const factors={activity:context==='race'?5*raceDemand:context==='training'?2*intensity:.3,age:active?clamp(1+Math.max(0,age(h,w.day)-4)*.12+(age(h,w.day)<=3&&h.traits.includes('Late Maturer')?.08:0),.85,2):1,career:active?clamp(1+p.cumulativeRacingStrain/180+p.repetitiveStressIndex/120,1,3.5):1,durability:active?clamp(1.5-p.latentDurabilityScore/100+p.baselineConformationRisk/300,.55,1.8):1,clinical:active?clamp(1+p.chronicSusceptibility/50+(100-h.soundness)/100,1,3):1,recent:active?clamp(1+h.fatigue/65+p.recentWorkload7d/180,1,3):1,care:clamp((1+(100-h.hoofHealth)/100)*(1-careTrait*3)*(fixture&&fixture.surface!==h.surface?1.12:1),.6,2),conditions:fixture?clamp((fixture.going==='firm'?1.08:fixture.going==='soft'?1.04:1)*(fixture.temperature>28?1.05:fixture.temperature<5?1.03:1)*(h.gear?.fit<70?1.1:1),1,1.3):1,conditioning:active?clamp(1.15-h.fitness/500,.9,1.15):1};
 const raw=RULES.injuryRisk*w.settings.injuryFrequency*Object.values(factors).reduce((n,v)=>n*v,1),probability=clamp(raw,0,context==='race'?.06:context==='training'?.035:.002);
 return {probability,factors,load,band:raw<.001?'Low':raw<.003?'Moderate':raw<.01?'Elevated':'High',activity:details.activity||context,reason:'Actual workload, age, inherited durability, clinical history, recent load and care; no guaranteed injury date.'};
}
