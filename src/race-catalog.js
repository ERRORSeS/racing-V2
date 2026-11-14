import { OFFICIAL_RACE_TYPES } from './race-types.js';
import { CLASSIC_SERIES } from './championships.js';
import { COUNTRIES } from './rules.js';
import { RACE_CLASSES, classLabel, conditionsFor, FIELD_DENSITY } from './race-rules.js';
import { seed } from './random.js';

// Synthetic 30-day months. These are original game meetings, not official fixtures.
export const MEETING_RULES = Object.freeze({version:4, days:[3,10,17,24], racesPerMeeting:6, lookaheadMonths:2});
const NAMES=['Horizon','Meadow','Meridian','Riverstone','Morning Light','Crown','Silver Fern','Willow','Northwind','Harbour','Autumn Leaf','Solstice'];
export function renewCalendar(w,start=w.day) {
 w.calendarGenerationLog??=[];
 publishClassics(w,start);
 const fixtureIds=new Set(w.fixtures.map(f=>f.id));
 const first=Math.floor(start/30)*30;
 for(let monthStart=first;monthStart<first+30*MEETING_RULES.lookaheadMonths;monthStart+=30){
  for(const [region,settings] of Object.entries(COUNTRIES)){
   const key=`${w.seed}:${region}:${monthStart}:v4`;
   const existingLog=w.calendarGenerationLog.find(log=>log.key===key);
   // A log records publication; fixture IDs prevent duplicates and allow missing cards to recover.
   const outputRaceIds=[],cycle=Math.floor(monthStart/30),density=FIELD_DENSITY[w.settings.fieldDensity||'Balanced'];
   for(const [meeting,offset] of MEETING_RULES.days.entries()){
     const day=monthStart+offset;
    for(let slot=0;slot<MEETING_RULES.racesPerMeeting;slot++){
     if(day<=w.day)continue;
     const juvenile=slot<4;
     const classId=slot===0?'maiden':slot===1?'novice':slot===2?'allowance':slot===3?['maiden','listed','g3','g2','g1','open'][(cycle+meeting+1)%6]:slot===4?['maiden','novice','allowance','claiming'][(cycle+meeting)%4]:['handicap','open','listed','g3','g2','g1'][(cycle+meeting)%6];
     const c=RACE_CLASSES.find(c=>c.id===classId),salt=seed(`${key}:${meeting}:${slot}`),distance=(juvenile?[1000,1200,1400,1600,1800]:[1200,1600,2000,2400,2800,3200])[salt%(juvenile?5:6)];
     const fixtureId=`fixture-v4-${region}-${monthStart}-${meeting}-${slot}`;
     // Older saves can have booked V3 races on this day; preserve them and avoid overbooking supply.
     if(fixtureIds.has(fixtureId))continue;
     const conditions={...conditionsFor(c,slot),sex:'open',minAge:juvenile?2:3,maxAge:juvenile?2:12};
     const f={id:fixtureId,seriesId:`local-${region}-${slot}-${classId}`,meetingId:`meeting-${region}-${monthStart}-${meeting}`,generatedCycleKey:key,templateVersion:4,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,day,country:region,track:settings.track,surface:slot===2?'synthetic':settings.surface,distance,title:`${NAMES[(cycle+meeting+slot)%NAMES.length]} ${juvenile?'Juvenile ':''}${classLabel(c,region)}`,grade:classLabel(c,region),classId,raceType:c.type,tier:c.tier,blackType:!!c.blackType,isAnnualMajor:false,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:conditions.minAge,maxAge:conditions.maxAge,maxRunners:Math.max(12,density.target),minStarters:2,targetFieldSize:density.target,conditions,purse:c.purse,claimPrice:c.claimPrice||null,fee:'10000',going:['firm','good','soft'][salt%3],temperature:Math.round(16+14*Math.sin(day/360*2*Math.PI)),course:{direction:['Japan','Australia'].includes(region)?'right':'left',turns:distance<=1200?0:2,undulating:['UK','Ireland'].includes(region)},resultId:null};
     w.fixtures.push(f);fixtureIds.add(f.id);outputRaceIds.push(f.id);
    }
   }
   if(existingLog){existingLog.outputRaceIds??=[];for(const id of outputRaceIds)if(!existingLog.outputRaceIds.includes(id))existingLog.outputRaceIds.push(id);}else w.calendarGenerationLog.push({key,region,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,templateVersion:4,outputRaceIds,committedAtGameTick:w.day});
  }
 }
 ensureRaceTypeCoverage(w,start);ensureYoungProgression(w,start);openGradedRaceAges(w);
}

function publishClassics(w,start){for(const year of [Math.floor(start/360)+1,Math.floor(start/360)+2])for(const series of CLASSIC_SERIES){const edition={...series,...w.settings.majorRaceOverrides?.[year]?.[series.id]},day=(year-1)*360+(edition.month-1)*30+edition.day-1,id=`major-USA-${year}-${series.id}`;if(day<=w.day||w.fixtures.some(f=>f.id===id))continue;const c=RACE_CLASSES.find(c=>c.id===edition.classId);w.fixtures.push({id,seriesId:series.id,majorSeriesId:series.id,year,country:'USA',day,track:edition.track||'Liberty Downs',surface:'dirt',distance:edition.distance,title:edition.name,grade:classLabel(c,'USA'),classId:c.id,raceType:c.type,tier:c.tier,blackType:true,isAnnualMajor:true,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:3,maxAge:3,maxRunners:20,minStarters:2,targetFieldSize:8,conditions:{sex:'open'},qualification:edition.qualification||null,qualifyingRoute:edition.points?'USA Derby':null,qualifyingPoints:edition.points||[],purse:series.id==='kentucky-derby'?'500000000':c.purse,fee:'10000',going:'good',course:{direction:'left',turns:2,undulating:false},resultId:null,dateModel:'Synthetic 30-day month approximation; configurable annual overrides, not a live official calendar'});}}

// Add missing types without rewriting a booked card, historical race or result.
export function ensureRaceTypeCoverage(w,start=w.day){
 const first=Math.floor(start/30)*30;
 for(let monthStart=first;monthStart<first+30*MEETING_RULES.lookaheadMonths;monthStart+=30)for(const [country,settings]of Object.entries(COUNTRIES)){
  const local=w.fixtures.filter(f=>!f.historical&&f.country===country&&f.day>=monthStart&&f.day<monthStart+30);
  // Leave deliberately partial/imported fixture sets alone; cover complete local programs.
  if(local.filter(f=>f.templateVersion===4).length<MEETING_RULES.days.length*MEETING_RULES.racesPerMeeting)continue;
  const present=new Set(local.filter(f=>['scheduled','running','completed'].includes(f.status)).map(f=>f.classId));
  const day=Math.max(monthStart+24,w.day+1);if(day>=monthStart+30)continue;
  for(const [classId]of OFFICIAL_RACE_TYPES){
   if(present.has(classId))continue;
   const fixtureId=`fixture-coverage-v7-${country}-${monthStart}-${classId}`;
   if(w.fixtures.some(f=>f.id===fixtureId))continue;
   const c=RACE_CLASSES.find(c=>c.id===classId),density=FIELD_DENSITY[w.settings.fieldDensity||'Balanced'],conditions={...conditionsFor(c),sex:'open',minAge:3,maxAge:12};
   w.fixtures.push({id:fixtureId,seriesId:`coverage-${country}-${classId}`,meetingId:`meeting-${country}-${monthStart}-coverage`,generatedCycleKey:`${w.seed}:${country}:${monthStart}:type-coverage-v7`,templateVersion:7,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,day,country,track:settings.track,surface:settings.surface,distance:1600,title:`Circuit ${classLabel(c,country)}`,grade:classLabel(c,country),classId,raceType:c.type,tier:c.tier,blackType:!!c.blackType,isAnnualMajor:false,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:3,maxAge:12,maxRunners:Math.max(12,density.target),minStarters:2,targetFieldSize:density.target,conditions,purse:c.purse,claimPrice:c.claimPrice||null,fee:'10000',going:'good',temperature:16,course:{direction:['Japan','Australia'].includes(country)?'right':'left',turns:2,undulating:['UK','Ireland'].includes(country)},resultId:null});
   const log=w.calendarGenerationLog?.find(log=>log.region===country&&log.year===Math.floor(monthStart/360)+1&&log.month===Math.floor(monthStart%360/30)+1);
   if(log){log.outputRaceIds??=[];if(!log.outputRaceIds.includes(fixtureId))log.outputRaceIds.push(fixtureId);}
   present.add(classId);
  }
 }
}

// Rating-building routes for ages 2–4, without changing any existing booked card.
export function ensureYoungProgression(w,start=w.day){
 const first=Math.floor(start/30)*30;
 for(let monthStart=first;monthStart<first+30*MEETING_RULES.lookaheadMonths;monthStart+=30)for(const [country,settings]of Object.entries(COUNTRIES)){
  const local=w.fixtures.filter(f=>!f.historical&&f.country===country&&f.day>=monthStart&&f.day<monthStart+30);
  if(local.filter(f=>f.templateVersion===4).length<24)continue;
  for(const [meeting,offset]of MEETING_RULES.days.entries()){
   const day=monthStart+offset;if(day<=w.day)continue;
   for(const [classId] of OFFICIAL_RACE_TYPES){
    const monthlyMeeting={maiden:0,novice:1,handicap:3,open:1,listed:2,g3:1,g2:2,g1:3};
    if(!['allowance','claiming'].includes(classId)&&monthlyMeeting[classId]!==meeting)continue;
    if(local.some(f=>f.day===day&&f.status==='scheduled'&&f.classId===classId&&f.minAge<=2&&f.maxAge>=4&&(!['allowance','claiming'].includes(classId)||f.conditions?.minRating==null&&f.conditions?.minWins==null&&f.conditions?.minPlacings==null)))continue;
    const id=`fixture-v7-young-${country}-${monthStart}-${meeting}-${classId}`;if(w.fixtures.some(f=>f.id===id))continue;
    const c=RACE_CLASSES.find(c=>c.id===classId),density=FIELD_DENSITY[w.settings.fieldDensity||'Balanced'];
    const f={id,seriesId:`young-${country}-${classId}`,meetingId:`meeting-${country}-${monthStart}-${meeting}`,generatedCycleKey:`${w.seed}:${country}:${monthStart}:young-v7`,templateVersion:7,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,day,country,track:settings.track,surface:settings.surface,distance:1600,title:`Young Horses ${classLabel(c,country)} (2–4)`,grade:classLabel(c,country),classId,raceType:c.type,tier:c.tier,blackType:!!c.blackType,isAnnualMajor:false,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:2,maxAge:4,maxRunners:Math.max(12,density.target),minStarters:2,targetFieldSize:density.target,conditions:{...conditionsFor(c),sex:'open',minAge:2,maxAge:4,minWins:null,minPlacings:null},purse:c.purse,claimPrice:c.claimPrice||null,fee:'10000',going:'good',temperature:16,course:{direction:['Japan','Australia'].includes(country)?'right':'left',turns:2,undulating:['UK','Ireland'].includes(country)},resultId:null};
    w.fixtures.push(f);local.push(f);const log=w.calendarGenerationLog?.find(l=>l.region===country&&l.year===f.year&&l.month===f.month);if(log){log.outputRaceIds??=[];if(!log.outputRaceIds.includes(id))log.outputRaceIds.push(id);}
   }
  }
 }
}

// Ordinary graded cards are open-age; named classics keep their published conditions.
// Only future scheduled cards change, leaving historical eligibility and results intact.
export function openGradedRaceAges(w){
 for(const f of w.fixtures){
  if(f.status!=='scheduled'||f.historical||f.isAnnualMajor||f.majorSeriesId||!['g3','g2','g1'].includes(f.classId))continue;
  f.minAge=2;f.maxAge=12;
  f.conditions??={};f.conditions.minAge=2;f.conditions.maxAge=12;
  f.title=f.title.replace(/Young Horses /g,'').replace(/Juvenile /g,'').replace(/ \(2–4\)/g,'');
 }
}

// Repair managed careers on load/advance without rebuilding healthy calendars on each click.
export function ensureCalendarHorizon(w){
 const ids=new Set(w.fixtures.map(f=>f.id)),first=Math.floor(w.day/30)*30;
 for(let monthStart=first;monthStart<first+30*MEETING_RULES.lookaheadMonths;monthStart+=30){
  for(const country of Object.keys(COUNTRIES))for(const [meeting,offset]of MEETING_RULES.days.entries()){
   if(monthStart+offset<=w.day)continue;
   for(let slot=0;slot<MEETING_RULES.racesPerMeeting;slot++){
    if(!ids.has(`fixture-v4-${country}-${monthStart}-${meeting}-${slot}`)){renewCalendar(w);return true;}
   }
  }
 }
 return false;
}
