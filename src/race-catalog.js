import { COUNTRIES } from './rules.js';
import { RACE_CLASSES, classLabel, conditionsFor, FIELD_DENSITY } from './race-rules.js';
import { seed } from './random.js';

// Synthetic 30-day months. These are original game meetings, not official fixtures.
export const MEETING_RULES = Object.freeze({version:4, days:[3,10,17,24], racesPerMeeting:6, lookaheadMonths:2});
const NAMES=['Horizon','Meadow','Meridian','Riverstone','Morning Light','Crown','Silver Fern','Willow','Northwind','Harbour','Autumn Leaf','Solstice'];
export function renewCalendar(w,start=w.day) {
 w.calendarGenerationLog??=[];
 const first=Math.floor(start/30)*30;
 for(let monthStart=first;monthStart<first+30*MEETING_RULES.lookaheadMonths;monthStart+=30){
  for(const [region,settings] of Object.entries(COUNTRIES)){
   const key=`${w.seed}:${region}:${monthStart}:v4`;
   if(w.calendarGenerationLog.some(log=>log.key===key))continue;
   const outputRaceIds=[],cycle=Math.floor(monthStart/30),density=FIELD_DENSITY[w.settings.fieldDensity||'Balanced'];
   for(const [meeting,offset] of MEETING_RULES.days.entries()){
     const day=monthStart+offset;
    for(let slot=0;slot<MEETING_RULES.racesPerMeeting;slot++){
     if(day<=w.day)continue;
     const juvenile=slot<4;
     const classId=slot===0?'maiden':slot===1?'novice':slot===2?'allowance':slot===3?['maiden','listed','g3','g2','g1','open'][(cycle+meeting+1)%6]:['handicap','listed','g3','g2','g1'][(cycle+meeting+slot)%5];
     const c=RACE_CLASSES.find(c=>c.id===classId),salt=seed(`${key}:${meeting}:${slot}`),distance=(juvenile?[1000,1200,1400,1600,1800]:[1200,1600,2000,2400,2800,3200])[salt%(juvenile?5:6)];
     const fixtureId=`fixture-v4-${region}-${monthStart}-${meeting}-${slot}`;
     // Older saves can have booked V3 races on this day; preserve them and avoid overbooking supply.
     if(w.fixtures.some(f=>f.id===fixtureId))continue;
     const conditions={...conditionsFor(c,slot),sex:'open',minAge:juvenile?2:3,maxAge:juvenile?2:12};
     const f={id:fixtureId,seriesId:`local-${region}-${slot}-${classId}`,meetingId:`meeting-${region}-${monthStart}-${meeting}`,generatedCycleKey:key,templateVersion:4,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,day,country:region,track:settings.track,surface:slot===2?'synthetic':settings.surface,distance,title:`${NAMES[(cycle+meeting+slot)%NAMES.length]} ${juvenile?'Juvenile ':''}${classLabel(c,region)}`,grade:classLabel(c,region),classId,raceType:c.type,tier:c.tier,blackType:!!c.blackType,isAnnualMajor:false,status:'scheduled',phase:'EntriesOpen',entries:[],minAge:conditions.minAge,maxAge:conditions.maxAge,maxRunners:Math.max(12,density.target),minStarters:2,targetFieldSize:density.target,conditions,purse:c.purse,claimPrice:c.claimPrice||null,fee:'10000',going:['firm','good','soft'][salt%3],temperature:Math.round(16+14*Math.sin(day/360*2*Math.PI)),course:{direction:['Japan','Australia'].includes(region)?'right':'left',turns:distance<=1200?0:2,undulating:['UK','Ireland'].includes(region)},resultId:null};
     w.fixtures.push(f);outputRaceIds.push(f.id);
    }
   }
   w.calendarGenerationLog.push({key,region,year:Math.floor(monthStart/360)+1,month:Math.floor(monthStart%360/30)+1,templateVersion:4,outputRaceIds,committedAtGameTick:w.day});
  }
 }
}
