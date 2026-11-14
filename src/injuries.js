// Fictional game balance parameters, not diagnostic or treatment advice.
export const INJURY_BALANCE=Object.freeze({version:2,raceMultiplier:12,trainingMultiplier:6,turnoutMultiplier:2,raceCap:.06,trainingCap:.035,turnoutCap:.002});
export const INJURY_TYPES=Object.freeze({
 muscle_strain:{label:'Minor muscle strain',severity:'Easy',weight:30,contexts:['training','race','turnout'],fatalRisk:0,notes:'Usually a good return outlook after rest and clearance; recurrence is possible.'},
 hoof_bruise:{label:'Bruised sole',severity:'Easy',weight:20,contexts:['training','race','turnout'],fatalRisk:0,notes:'Hoof care, protected exercise and a veterinary review before full work.'},
 joint_soreness:{label:'Joint inflammation',severity:'Easy',weight:15,contexts:['training','race','turnout'],fatalRisk:0,notes:'Rest and reassessment; do not race while discomfort remains.'},
 muscle_tear:{label:'Moderate muscle tear',severity:'Medium',weight:15,contexts:['training','race'],fatalRisk:0,notes:'A staged return to controlled exercise and condition rebuilding.'},
 tendon_strain:{label:'Tendon strain',severity:'Medium',weight:12,contexts:['training','race','turnout'],fatalRisk:0,notes:'Longer rest, supervised rehabilitation and a gradual return; no early racing.'},
 ligament_injury:{label:'Suspensory ligament injury',severity:'More Than Medium',weight:8,contexts:['training','race','turnout'],fatalRisk:0,notes:'Extended rehabilitation. Racing return depends on healing and functional soundness.'},
 stress_fracture:{label:'Stress fracture',severity:'More Than Medium',weight:5,contexts:['training','race'],fatalRisk:0,notes:'Strict rest and repeat veterinary assessment before controlled loading.'},
 tendon_tear:{label:'Major tendon tear',severity:'Severe',weight:3,contexts:['training','race','turnout'],fatalRisk:0,notes:'Guarded return outlook; lasting soundness loss and retirement may be appropriate.'},
 joint_damage:{label:'Serious joint injury',severity:'Severe',weight:2,contexts:['training','race','turnout'],fatalRisk:0,notes:'Long rehabilitation with permanent limits; reassess comfort and future use.'},
 tendon_rupture:{label:'Tendon rupture',severity:'Very Severe',weight:1.5,contexts:['training','race','turnout'],fatalRisk:.10,notes:'Permanent racing retirement recommended. Long-term comfort care; Serious complications can be fatal when fatalities are enabled.'},
 leg_fracture:{label:'Leg fracture',severity:'Very Severe',weight:4,contexts:['training','race','turnout'],fatalRisk:.35,notes:'Emergency veterinary stabilization. Survivors have permanent racing restrictions; a 35% fatal-complication chance if fatalities are enabled.'},
 fetlock_fracture:{label:'Fetlock fracture',severity:'Very Severe',weight:3,contexts:['training','race'],fatalRisk:.40,notes:'Serious emergency with guarded prognosis. Racing retirement and ongoing comfort care for survivors.'},
});
export function chooseInjury(w,context,draw){const eligible=Object.entries(INJURY_TYPES).filter(([,t])=>t.contexts.includes(context));const sum=eligible.reduce((n,[,t])=>n+t.weight,0);let roll=draw(w)*sum;for(const [id,t]of eligible){roll-=t.weight;if(roll<=0)return {id,...t};}const [id,t]=eligible.at(-1);return {id,...t};}
